'use server';

import { redirect } from 'next/navigation';
import { formWindow } from '@/lib/form-window';
import { createAdminClient } from '@/lib/supabase/admin';
import { needsId } from '@/lib/access';
import { buildPayload } from '@/lib/clean-answers';
import { ROLE_LABEL, idShort } from '@/lib/text';
import { generateToken } from '@/lib/token';
import { verifyTurnstile } from '@/lib/turnstile';
import { ROLES, type ActionResult, type Answers, type Question, type Role } from '@/lib/types';
import { PERIOD_WORD, usedThisPeriod, type RepeatMode } from '@/lib/period';

/* ---------- Masuk dengan nomor induk (mode Kode, atau Terbuka + NIT/NIP) ---------- */
export type IdentifyInput = { slug: string; role: Role; code?: string | null; identifier: string };

/** Cocokkan peran + nomor induk (+ kode angket), lalu arahkan ke link pribadi /isi/[token]. */
export async function identify(input: IdentifyInput): Promise<{ error: string }> {
  const role = input.role;
  const identifier = String(input.identifier ?? '').trim();
  const code = String(input.code ?? '').trim().toUpperCase();
  if (!ROLES.includes(role)) return { error: 'Pilih peran terlebih dahulu.' };
  if (!identifier) return { error: `Isi ${idShort(role)} terlebih dahulu.` };

  const db = createAdminClient();
  const { data: form } = await db
    .from('forms')
    .select('id, access_mode, access_code, open_id, repeat_mode, targets, status, opens_at, closes_at, open_days, open_time, close_time')
    .eq('slug', input.slug)
    .maybeSingle();
  if (!form || form.access_mode === 'token') return { error: 'Angket tidak ditemukan.' };
  const w = formWindow(form);
  if (!w.open) return { error: w.title + '.' };
  if (!(form.targets as Role[]).includes(role)) return { error: `Pengisian ini bukan untuk ${ROLE_LABEL[role]}.` };
  if (form.access_mode === 'kode') {
    if (!code) return { error: 'Isi kode angket.' };
    if ((form.access_code ?? '').toUpperCase() !== code) return { error: 'Kode angket salah.' };
  } else if (!needsId(form, role)) {
    return { error: 'Peran ini tidak perlu nomor induk. Muat ulang halaman.' };
  }

  const { data: person } = await db
    .from('respondents')
    .select('id, role')
    .eq('identifier', identifier)
    .eq('active', true)
    .maybeSingle();
  if (!person) return { error: `${idShort(role)} tidak terdaftar. Hubungi admin sekolah.` };
  if (person.role !== role)
    return { error: `Nomor ini terdaftar sebagai ${ROLE_LABEL[person.role as Role]}, bukan ${ROLE_LABEL[role]}.` };

  const { data: tok } = await db
    .from('access_tokens')
    .select('token, used_at')
    .eq('form_id', form.id)
    .eq('respondent_id', person.id)
    .maybeSingle();
  if (tok && usedThisPeriod(form.repeat_mode as RepeatMode, tok.used_at as string | null)) {
    return {
      error: form.repeat_mode === 'sekali'
        ? 'Nomor induk ini sudah dipakai mengisi. Terima kasih.'
        : `Anda sudah mengisi ${PERIOD_WORD[form.repeat_mode as RepeatMode]}. Silakan kembali ${form.repeat_mode === 'mingguan' ? 'minggu depan' : 'besok'}.`,
    };
  }

  let token = tok?.token as string | undefined;
  if (!token) {
    token = generateToken();
    const { error } = await db.from('access_tokens').insert({ form_id: form.id, respondent_id: person.id, token });
    if (error) return { error: 'Terjadi gangguan. Coba lagi.' };
  }
  redirect(`/isi/${token}`);
}

/* ---------- Kirim jawaban ---------- */
export type SubmitInput = {
  formId: string;
  token?: string | null;
  deviceId?: string | null;
  role?: Role | null;
  answers: Answers;
  turnstileToken?: string | null;
};

const ERRORS: Record<string, string> = {
  ANGKET_TIDAK_ADA: 'Angket tidak ditemukan.',
  ANGKET_TIDAK_DIBUKA: 'Angket sedang tidak dibuka.',
  ANGKET_BELUM_DIBUKA: 'Angket belum dibuka.',
  ANGKET_SUDAH_DITUTUP: 'Angket sudah ditutup.',
  ANGKET_BUKAN_HARINYA: 'Hari ini bukan jadwal pengisian angket.',
  ANGKET_BELUM_JAMNYA: 'Belum masuk jam pengisian angket.',
  ANGKET_LEWAT_JAMNYA: 'Jam pengisian hari ini sudah selesai.',
  PERANGKAT_SUDAH_MENGISI: 'Jawaban dari perangkat ini sudah terkirim pada periode ini.',
  TOKEN_TIDAK_VALID: 'Link tidak valid.',
  TOKEN_SUDAH_DIPAKAI: 'Jawaban dari link ini sudah pernah terkirim.',
  TOKEN_DIPERLUKAN: 'Angket ini hanya bisa diisi lewat link pribadi.',
};

export async function submitAnswers(input: SubmitInput): Promise<ActionResult> {
  const db = createAdminClient();
  const { data: form } = await db
    .from('forms')
    .select('id, access_mode, open_id, repeat_mode, targets, status, opens_at, closes_at, open_days, open_time, close_time')
    .eq('id', input.formId)
    .maybeSingle();
  if (!form) return { ok: false, error: ERRORS.ANGKET_TIDAK_ADA };

  let role: Role;
  const token = input.token ? input.token.toUpperCase() : null;
  if (token) {
    const { data: tok } = await db
      .from('access_tokens')
      .select('used_at, respondents(role, active)')
      .eq('token', token)
      .eq('form_id', form.id)
      .maybeSingle();
    if (!tok) return { ok: false, error: ERRORS.TOKEN_TIDAK_VALID };
    if (usedThisPeriod(form.repeat_mode as RepeatMode, tok.used_at as string | null)) {
      return { ok: false, error: form.repeat_mode === 'sekali' ? ERRORS.TOKEN_SUDAH_DIPAKAI : `Anda sudah mengisi ${PERIOD_WORD[form.repeat_mode as RepeatMode]}.` };
    }
    const r = tok.respondents as unknown as { role: Role; active: boolean } | null;
    if (!r) return { ok: false, error: ERRORS.TOKEN_TIDAK_VALID };
    if (!r.active) return { ok: false, error: 'Data responden ini sedang dinonaktifkan. Hubungi admin sekolah.' };
    role = r.role;
  } else {
    if (form.access_mode !== 'terbuka') return { ok: false, error: ERRORS.TOKEN_DIPERLUKAN };
    if (!input.role || !(form.targets as Role[]).includes(input.role)) return { ok: false, error: 'Pilih peran Anda terlebih dahulu.' };
    if (needsId(form, input.role)) return { ok: false, error: `Isi ${idShort(input.role)} terlebih dahulu. Muat ulang halaman.` };
    if (!input.deviceId) return { ok: false, error: 'Perangkat tidak dikenali. Muat ulang halaman.' };
    if (!(await verifyTurnstile(input.turnstileToken))) return { ok: false, error: 'Verifikasi keamanan gagal. Coba lagi.' };
    role = input.role;
  }

  const { data: qrows } = await db
    .from('questions')
    .select('id, type, title, required, roles, options, settings')
    .eq('form_id', form.id)
    .order('position');
  const questions = ((qrows ?? []) as Question[]).filter((q) => q.roles.includes(role));

  const built = buildPayload(questions, input.answers);
  if (!built.ok) return { ok: false, error: built.error };
  const payload = built.payload;

  const { error } = await db.rpc('submit_response', {
    p_form_id: form.id,
    p_token: token,
    p_device_id: token ? null : input.deviceId,
    p_role: role,
    p_answers: payload,
  });
  if (error) {
    if (error.code === '23505')
      return { ok: false, error: form.repeat_mode === 'sekali' ? 'Jawaban dari perangkat ini sudah pernah terkirim.' : `Jawaban dari perangkat ini sudah terkirim ${PERIOD_WORD[form.repeat_mode as RepeatMode]}.` };
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    return { ok: false, error: key ? ERRORS[key] : 'Gagal mengirim jawaban. Periksa koneksi lalu coba lagi.' };
  }
  return { ok: true };
}
