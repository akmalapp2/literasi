import type { AccessMode, OpenId, Role } from './types';

/** Apakah peran ini harus mengisi nomor induk (NIT/NIP) sebelum mengisi angket. */
export function needsId(form: { access_mode: AccessMode; open_id?: OpenId | null }, role: Role): boolean {
  if (form.access_mode === 'kode') return true;
  if (form.access_mode !== 'terbuka') return false;
  const mode = form.open_id ?? 'semua';
  if (mode === 'semua') return role !== 'umum';
  if (mode === 'siswa') return role === 'siswa';
  return false;
}
