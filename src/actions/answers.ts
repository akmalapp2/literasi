'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { buildPayload } from '@/lib/clean-answers';
import { periodKey, periodLabel, rangeOfKey, type RepeatMode } from '@/lib/period';
import type { ActionResult, Answers, Question, Role } from '@/lib/types';

type Sb = Awaited<ReturnType<typeof requireAdmin>>['supabase'];

/** Samakan "terakhir mengisi" pada link pribadi dengan jawaban terbaru yang tersisa. */
async function syncUsedAt(supabase: Sb, formId: string, respondentId: string) {
  const { data: last } = await supabase
    .from('responses')
    .select('submitted_at')
    .eq('form_id', formId)
    .eq('respondent_id', respondentId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  await supabase
    .from('access_tokens')
    .update({ used_at: last?.submitted_at ?? null })
    .eq('form_id', formId)
    .eq('respondent_id', respondentId);
}

function revalidate(formId: string) {
  revalidatePath('/admin');
  revalidatePath(`/admin/angket/${formId}/jawaban`);
  revalidatePath(`/admin/angket/${formId}/responden`);
}

/** Hapus satu jawaban (satu kali pengisian). Minggu/riwayat lain tidak tersentuh. */
export async function deleteResponse(responseId: string, formId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { data: resp } = await supabase
    .from('responses')
    .select('id, respondent_id')
    .eq('id', responseId)
    .eq('form_id', formId)
    .maybeSingle();
  if (!resp) return { ok: false, error: 'Jawaban tidak ditemukan.' };
  const { error } = await supabase.from('responses').delete().eq('id', responseId);
  if (error) return { ok: false, error: 'Gagal menghapus: ' + error.message };
  if (resp.respondent_id) await syncUsedAt(supabase, formId, resp.respondent_id as string);
  revalidate(formId);
  return { ok: true, message: 'Jawaban dihapus.' };
}

export type AdminFillInput = {
  formId: string;
  respondentId: string;
  /** Tanggal pengisian susulan, YYYY-MM-DD (WITA). */
  date: string;
  /** Jam pengisian, HH:MM (WITA). */
  time: string;
  answers: Answers;
};

/** Isi susulan oleh admin atas nama responden, untuk tanggal yang dipilih. */
export async function adminFill(input: AdminFillInput): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: 'Tanggal tidak valid.' };
  const time = /^\d{2}:\d{2}$/.test(input.time) ? input.time : '10:00';
  const at = new Date(`${input.date}T${time}:00+08:00`);
  if (Number.isNaN(at.getTime())) return { ok: false, error: 'Tanggal tidak valid.' };
  if (at.getTime() > Date.now() + 60_000) return { ok: false, error: 'Tanggal susulan tidak boleh di masa depan.' };

  const [{ data: form }, { data: person }] = await Promise.all([
    supabase.from('forms').select('id, repeat_mode, targets').eq('id', input.formId).maybeSingle(),
    supabase.from('respondents').select('id, name, role, class_name').eq('id', input.respondentId).maybeSingle(),
  ]);
  if (!form) return { ok: false, error: 'Angket tidak ditemukan.' };
  if (!person) return { ok: false, error: 'Responden tidak ditemukan.' };
  const role = person.role as Role;
  if (!(form.targets as Role[]).includes(role)) return { ok: false, error: 'Angket ini bukan untuk peran responden tersebut.' };

  // Sekali per periode (sekali / minggu / hari) — sama dengan aturan pengisian biasa.
  const mode = (form.repeat_mode ?? 'sekali') as RepeatMode;
  const key = periodKey(mode, at);
  let dup = supabase.from('responses').select('id', { count: 'exact', head: true }).eq('form_id', form.id).eq('respondent_id', person.id);
  const rg = rangeOfKey(key);
  if (rg) dup = dup.gte('submitted_at', rg.start).lt('submitted_at', rg.end);
  const { count } = await dup;
  if (count) {
    return {
      ok: false,
      error: mode === 'sekali'
        ? `${person.name} sudah pernah mengisi angket ini.`
        : `${person.name} sudah punya jawaban untuk ${periodLabel(key)}. Hapus dulu jawaban itu jika ingin menggantinya.`,
    };
  }

  const { data: qrows } = await supabase
    .from('questions')
    .select('id, type, title, required, roles, options, settings')
    .eq('form_id', form.id)
    .order('position');
  const questions = ((qrows ?? []) as Question[]).map((q) => ({ ...q, settings: q.settings ?? {} })).filter((q) => q.roles.includes(role));
  const built = buildPayload(questions, input.answers, false);
  if (!built.ok) return { ok: false, error: built.error };
  if (!Object.keys(built.payload).length) return { ok: false, error: 'Isi minimal satu jawaban.' };

  const { data: resp, error: rErr } = await supabase
    .from('responses')
    .insert({
      form_id: form.id,
      respondent_id: person.id,
      role,
      class_name: person.class_name,
      submitted_at: at.toISOString(),
      period_key: key,
      source: 'admin',
    })
    .select('id')
    .single();
  if (rErr || !resp) {
    return { ok: false, error: rErr?.code === '23505' ? 'Sudah ada jawaban untuk periode itu.' : 'Gagal menyimpan: ' + (rErr?.message ?? '') };
  }

  const rows = Object.entries(built.payload).map(([qid, v]) => ({
    response_id: resp.id,
    question_id: qid,
    value_text: Array.isArray(v) ? null : v,
    value_list: Array.isArray(v) ? v : null,
  }));
  const { error: aErr } = await supabase.from('answers').insert(rows);
  if (aErr) {
    await supabase.from('responses').delete().eq('id', resp.id);
    return { ok: false, error: 'Gagal menyimpan jawaban: ' + aErr.message };
  }

  await syncUsedAt(supabase, form.id as string, person.id as string);
  revalidate(form.id as string);
  redirect(`/admin/angket/${form.id}/jawaban?responden=${person.id}&ok=${encodeURIComponent(`Isi susulan ${periodLabel(key)} tersimpan.`)}`);
}
