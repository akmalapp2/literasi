'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { generateToken } from '@/lib/token';
import type { ActionResult } from '@/lib/types';
import type { RepeatMode } from '@/lib/period';
import { hasFilled } from '@/lib/filled';
import { fetchAll } from '@/lib/fetch-all';

/** Buat link pribadi untuk semua responden aktif yang sesuai sasaran angket. */
export async function generateTokens(formId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { data: form } = await supabase.from('forms').select('targets').eq('id', formId).single();
  if (!form) return { ok: false, error: 'Angket tidak ditemukan.' };

  const people = await fetchAll<{ id: string }>((a, b) =>
    supabase.from('respondents').select('id').eq('active', true).in('role', form.targets as string[]).order('id').range(a, b),
  );
  const existing = await fetchAll<{ respondent_id: string }>((a, b) =>
    supabase.from('access_tokens').select('respondent_id').eq('form_id', formId).order('id').range(a, b),
  );
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
    supabase.from('access_tokens').select('respondent_id').eq('id', tokenId).single(),
  ]);
  if (!tok) return { ok: false, error: 'Link tidak ditemukan.' };
  if (await hasFilled(supabase, formId, tok.respondent_id as string, form?.repeat_mode as RepeatMode))
    return { ok: false, error: 'Responden ini sudah mengisi pada periode ini. Hapus jawabannya di halaman Jawaban jika ingin diisi ulang.' };
  const { error } = await supabase
    .from('access_tokens')
    .update({ token: generateToken() })
    .eq('id', tokenId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/angket/${formId}/responden`);
  return { ok: true, message: 'Link baru dibuat. Link lama tidak berlaku lagi.' };
}
