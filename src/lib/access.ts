import type { AccessMode, OpenId, Role } from './types';

type AccessForm = { access_mode: AccessMode; open_id?: OpenId | null; require_code?: boolean | null };

/** Link umum: apakah peran ini harus mengisi nomor induk (NIT/NIP). */
export function needsId(form: AccessForm, role: Role): boolean {
  if (form.access_mode !== 'umum') return false;
  const mode = form.open_id ?? 'semua';
  if (mode === 'semua') return role !== 'umum';
  if (mode === 'siswa') return role === 'siswa';
  return false;
}

/** Link umum: apakah wajib mengisi kode angket. */
export function needsCode(form: AccessForm): boolean {
  return form.access_mode === 'umum' && !!form.require_code;
}

/** Apakah peran ini perlu langkah "identitas" (kode dan/atau nomor induk) sebelum mengisi. */
export function needsGate(form: AccessForm, role: Role): boolean {
  return needsCode(form) || needsId(form, role);
}

/** Bandingkan kode (tanpa membedakan huruf besar/kecil & spasi di tepi). */
export function codeMatches(expected: string | null | undefined, given: string | null | undefined): boolean {
  const a = (expected ?? '').trim().toUpperCase();
  return !!a && a === (given ?? '').trim().toUpperCase();
}
