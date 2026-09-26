'use server';

import { redirect } from 'next/navigation';
import { formWindow } from '@/lib/form-window';
import { createAdminClient } from '@/lib/supabase/admin';
import { filled, isOther, otherText, problem } from '@/lib/answers';
import { generateToken } from '@/lib/token';
import { verifyTurnstile } from '@/lib/turnstile';
import type { ActionResult, AnswerValue, Answers, Question, Role } from '@/lib/types';

/* ---------- Mode "Kode angket + NISN/NIP" ---------- */
export async function enterWithCode(_prev: { error: string } | null, formData: FormData): Promise<{ error: string }> {
  const slug = String(formData.get('slug') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const identifier = String(formData.get('identifier') ?? '').trim();
  if (!code || !identifier) return { error: 'Isi kode angket dan NISN/NIP.' };

  const db = createAdminClient();
  const { data: form } = await db
    .from('forms')
    .select('id, access_mode, access_code, targets, status, opens_at, closes_at')
    .eq('slug', slug)
    .maybeSingle();
  if (!form || form.access_mode !== 'kode') return { error: 'Angket tidak ditemukan.' };
  const w = formWindow(form);
  if (!w.open) return { error: w.title + '.' };
  if ((form.access_code ?? '').toUpperCase() !== code) return { error: 'Kode angket salah.' };

  const { data: person } = await db
    .from('respondents')
    .select('id, role')
    .eq('identifier', identifier)
    .eq('active', true)
    .maybeSingle();
  if (!person) return { error: 'NISN/NIP tidak terdaftar. Hubungi admin sekolah.' };
  if (!(form.targets as Role[]).includes(person.role as Role)) return { error: 'Angket ini bukan untuk peran Anda.' };

  const { data: tok } = await db
    .from('access_tokens')
    .select('token, used_at')
    .eq('form_id', form.id)
    .eq('respondent_id', person.id)
    .maybeSingle();

  let token = tok?.token as string | undefined;
  if (tok?.used_at) return { error: 'Anda sudah mengisi angket ini. Terima kasih.' };
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
  TOKEN_TIDAK_VALID: 'Link tidak valid.',
  TOKEN_SUDAH_DIPAKAI: 'Jawaban dari link ini sudah pernah terkirim.',
  TOKEN_DIPERLUKAN: 'Angket ini hanya bisa diisi lewat link pribadi.',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Rapikan & validasi satu jawaban. Mengembalikan nilai bersih, atau { error }. */
function clean(q: Question, v: AnswerValue | undefined): { value?: AnswerValue; error?: string } {
  if (v === undefined) return {};
  const err = problem(q, v);
  if (err) return { error: `${q.title.slice(0, 60)}: ${err}` };
  const allowOther = !!q.settings?.allow_other;
  const pickOne = (x: string): string | undefined => {
    if (isOther(x)) return allowOther ? otherText(x).trim().slice(0, 200) || undefined : undefined;
    return q.options.includes(x) ? x : undefined;
  };
  switch (q.type) {
    case 'radio':
    case 'dropdown':
      return { value: typeof v === 'string' ? pickOne(v) : undefined };
    case 'checkbox': {
      if (!Array.isArray(v)) return {};
      const chosen = q.options.filter((o) => v.includes(o));
      const other = v.find((x) => isOther(x));
      const typed = other ? pickOne(other) : undefined;
      return { value: typed ? [...chosen, typed] : chosen };
    }
    case 'short':
      return { value: typeof v === 'string' ? v.trim().slice(0, 300) : undefined };
    case 'long':
      return { value: typeof v === 'string' ? v.trim().slice(0, 4000) : undefined };
    case 'date':
      return { value: typeof v === 'string' && DATE_RE.test(v) ? v : undefined };
    case 'range':
      return { value: Array.isArray(v) && v.length === 2 && filled(q, v) ? v.map((x) => String(Number(x.trim()))) : undefined };
  }
}

export async function submitAnswers(input: SubmitInput): Promise<ActionResult> {
  const db = createAdminClient();
  const { data: form } = await db.from('forms').select('id, access_mode, targets').eq('id', input.formId).maybeSingle();
  if (!form) return { ok: false, error: ERRORS.ANGKET_TIDAK_ADA };

  let role: Role;
  const token = input.token ? input.token.toUpperCase() : null;
  if (token) {
    const { data: tok } = await db
      .from('access_tokens')
      .select('used_at, respondents(role)')
      .eq('token', token)
      .eq('form_id', form.id)
      .maybeSingle();
    if (!tok) return { ok: false, error: ERRORS.TOKEN_TIDAK_VALID };
    if (tok.used_at) return { ok: false, error: ERRORS.TOKEN_SUDAH_DIPAKAI };
    const r = tok.respondents as unknown as { role: Role } | null;
    if (!r) return { ok: false, error: ERRORS.TOKEN_TIDAK_VALID };
    role = r.role;
  } else {
    if (form.access_mode !== 'terbuka') return { ok: false, error: ERRORS.TOKEN_DIPERLUKAN };
    if (!input.role || !(form.targets as Role[]).includes(input.role)) return { ok: false, error: 'Pilih peran Anda terlebih dahulu.' };
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

  const payload: Answers = {};
  for (const q of questions) {
    const { value, error } = clean(q, input.answers?.[q.id]);
    if (error) return { ok: false, error };
    const ok = value !== undefined && filled(q, value);
    if (q.required && !ok) return { ok: false, error: `Pertanyaan "${q.title.slice(0, 60)}" wajib diisi.` };
    if (ok) payload[q.id] = value;
  }

  const { error } = await db.rpc('submit_response', {
    p_form_id: form.id,
    p_token: token,
    p_device_id: token ? null : input.deviceId,
    p_role: role,
    p_answers: payload,
  });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Jawaban dari perangkat ini sudah pernah terkirim.' };
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    return { ok: false, error: key ? ERRORS[key] : 'Gagal mengirim jawaban. Periksa koneksi lalu coba lagi.' };
  }
  return { ok: true };
}
