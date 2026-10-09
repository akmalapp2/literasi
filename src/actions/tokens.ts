'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { generateToken } from '@/lib/token';
import type { ActionResult } from '@/lib/types';
import { PERIOD_WORD, periodRange, usedThisPeriod, type RepeatMode } from '@/lib/period';

/** Buat link pribadi untuk semua responden aktif yang sesuai sasaran angket. */
export async function generateTokens(formId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { data: form } = await supabase.from('forms').select('targets').eq('id', formId).single();
  if (!form) return { ok: false, error: 'Angket tidak ditemukan.' };

  const { data: people, error: pErr } = await supabase
    .from('respondents')
    .select('id')
    .eq('active', true)
    .in('role', form.targets as string[])
    .range(0, 9999);
  if (pErr) return { ok: false, error: pErr.message };

  const { data: existing } = await supabase
    .from('access_tokens')
    .select('respondent_id')
    .eq('form_id', formId)
    .range(0, 9999);
  const have = new Set((existing ?? []).map((e) => e.respondent_id as string));
  const missing = (people ?? []).filter((p) => !have.has(p.id as string));
  if (!missing.length) return { ok: true, message: 'Semua responden sudah punya link.' };

  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = missing.map((p) => ({ form_id: formId, respondent_id: p.id, token: generateToken() }));
    const { error } = await supabase
      .from('access_tokens')
      .upsert(rows, { onConflict: 'form_id,respondent_id', ignoreDuplicates: true });
    if (!error) {
      revalidatePath(`/admin/angket/${formId}/responden`);
      return { ok: true, message: `${missing.length} link baru dibuat.` };
    }
    if (error.code !== '23505') return { ok: false, error: error.message };
  }
  return { ok: false, error: 'Gagal membuat link. Coba lagi.' };
}

/** Ganti token (link lama tidak berlaku). Hanya untuk yang belum mengisi. */
export async function regenerateToken(tokenId: string, formId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const [{ data: form }, { data: tok }] = await Promise.all([
    supabase.from('forms').select('repeat_mode').eq('id', formId).single(),
    supabase.from('access_tokens').select('used_at').eq('id', tokenId).single(),
  ]);
  if (!tok) return { ok: false, error: 'Link tidak ditemukan.' };
  if (usedThisPeriod(form?.repeat_mode as RepeatMode, tok.used_at as string | null))
    return { ok: false, error: 'Responden ini sudah mengisi pada periode ini. Gunakan "Izinkan isi ulang".' };
  const { error } = await supabase
    .from('access_tokens')
    .update({ token: generateToken() })
    .eq('id', tokenId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/angket/${formId}/responden`);
  return { ok: true, message: 'Link baru dibuat. Link lama tidak berlaku lagi.' };
}

/** Hapus jawaban responden ini supaya ia bisa mengisi ulang (misalnya salah isi). */
export async function allowRefill(tokenId: string, formId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const [{ data: tok }, { data: form }] = await Promise.all([
    supabase.from('access_tokens').select('respondent_id').eq('id', tokenId).single(),
    supabase.from('forms').select('repeat_mode').eq('id', formId).single(),
  ]);
  if (!tok) return { ok: false, error: 'Link tidak ditemukan.' };
  // Mode berulang: hanya jawaban periode ini yang dihapus; riwayat sebelumnya tetap.
  let del = supabase.from('responses').delete().eq('form_id', formId).eq('respondent_id', tok.respondent_id);
  const rg = form ? periodRange(form.repeat_mode as RepeatMode) : null;
  if (rg) del = del.gte('submitted_at', rg.start).lt('submitted_at', rg.end);
  await del;
  const { error } = await supabase
    .from('access_tokens')
    .update({ used_at: null, token: generateToken() })
    .eq('id', tokenId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/angket/${formId}/responden`);
  return {
    ok: true,
    message: form && form.repeat_mode !== 'sekali'
      ? `Jawaban ${PERIOD_WORD[form.repeat_mode as RepeatMode]} dihapus. Kirim link baru ke responden.`
      : 'Jawaban lama dihapus. Kirim link baru ke responden.',
  };
}
