import type { QType, Role } from './types';

export const ROLE_LABEL: Record<Role, string> = {
  kepsek: 'Kepala Sekolah',
  guru: 'Guru',
  siswa: 'Siswa',
};
export const ROLE_SHORT: Record<Role, string> = { kepsek: 'Kepsek', guru: 'Guru', siswa: 'Siswa' };

export const TYPE_LABEL: Record<QType, string> = {
  short: 'Isian singkat',
  long: 'Isian panjang',
  radio: 'Pilihan ganda',
  checkbox: 'Kotak centang',
  dropdown: 'Dropdown',
  date: 'Tanggal',
  range: 'Rentang angka',
};
export const TYPE_ICON: Record<QType, string> = {
  short: 'bi-text-left',
  long: 'bi-text-paragraph',
  radio: 'bi-record-circle',
  checkbox: 'bi-check-square',
  dropdown: 'bi-menu-button-wide',
  date: 'bi-calendar-event',
  range: 'bi-arrow-left-right',
};

export const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const isChoice = (t: QType) => t === 'radio' || t === 'checkbox' || t === 'dropdown';

/** Ganti {kamu} dan {tugas} sesuai peran responden. */
export function personalize(text: string, role: Role | null | undefined): string {
  const r: Role = role ?? 'siswa';
  const kamu = r === 'siswa' ? 'kamu' : 'Bapak/Ibu';
  const tugas = r === 'siswa' ? 'jam pelajaran' : r === 'guru' ? 'tugas mengajar' : 'tugas dinas';
  const out = text.replaceAll('{kamu}', kamu).replaceAll('{tugas}', tugas);
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function greetingName(name: string, role: Role): string {
  if (role !== 'siswa') return 'Bapak/Ibu';
  return name.split(/\s+/)[0] ?? name;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Makassar',
  }).format(new Date(iso));
}

export function formatDay(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' })
    .format(new Date(iso));
}

/** Versi netral untuk halaman hasil (dibaca semua peran). */
export function neutral(text: string): string {
  const out = text.replaceAll('{kamu}', 'Anda').replaceAll('{tugas}', 'jam pelajaran/tugas');
  return out.charAt(0).toUpperCase() + out.slice(1);
}
