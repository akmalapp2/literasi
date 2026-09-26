import type { QType, Role } from './types';

export const ROLE_LABEL: Record<Role, string> = {
  kepsek: 'Kepala Sekolah',
  guru: 'Guru',
  tendik: 'Tenaga Kependidikan',
  siswa: 'Siswa',
  ortu: 'Orang Tua/Wali',
  alumni: 'Alumni',
  umum: 'Masyarakat Umum',
};
export const ROLE_SHORT: Record<Role, string> = {
  kepsek: 'Kepsek',
  guru: 'Guru',
  tendik: 'Tendik',
  siswa: 'Siswa',
  ortu: 'Ortu',
  alumni: 'Alumni',
  umum: 'Umum',
};

/** Label nomor induk sesuai peran: NIT untuk siswa & alumni, NIP untuk guru/kepsek. */
export const ID_LABEL: Record<Role, string> = {
  kepsek: 'NIP',
  guru: 'NIP / NUPTK',
  tendik: 'NIP / NUPTK',
  siswa: 'NIT (Nomor Induk Taruna)',
  ortu: 'NIK',
  alumni: 'NIT (Nomor Induk Taruna)',
  umum: 'Nomor identitas',
};
/** Versi pendek, mis. "NIT", "NIP / NUPTK". */
export const idShort = (r: Role) => ID_LABEL[r].split(' (')[0];

/** Pembuat aplikasi (ditampilkan di footer). */
export const CREATOR = 'Akmal Iskandar, S.Pi';

/** Peran yang memakai kolom "kelas": siswa (kelas), orang tua (kelas anak), alumni (tahun lulus). */
export const usesClass = (r: Role) => r === 'siswa' || r === 'ortu' || r === 'alumni';

/** Label kolom kelas/keterangan sesuai peran. */
export function classLabel(r: Role): string {
  return r === 'ortu' ? 'Kelas anak' : r === 'alumni' ? 'Tahun lulus' : 'Kelas';
}

/** Keterangan singkat responden, mis. "Siswa, kelas XI NKPI 1". */
export function roleDetail(r: Role, className: string | null, subject: string | null): string {
  if (r === 'siswa') return `Siswa${className ? `, kelas ${className}` : ''}`;
  if (r === 'ortu') return `Orang tua/wali${className ? `, kelas ${className}` : ''}`;
  if (r === 'alumni') return `Alumni${className ? `, lulus ${className}` : ''}`;
  return `${ROLE_LABEL[r]}${subject ? `, ${subject}` : ''}`;
}

/** Sapaan orang kedua: "kamu" (siswa), "Anda" (alumni, umum), "Bapak/Ibu" (lainnya). */
export function addressee(r: Role | null | undefined): string {
  if (!r || r === 'siswa') return 'kamu';
  if (r === 'alumni' || r === 'umum') return 'Anda';
  return 'Bapak/Ibu';
}

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
  const kamu = addressee(role);
  const tugas: Record<Role, string> = {
    siswa: 'jam pelajaran',
    guru: 'tugas mengajar',
    kepsek: 'tugas dinas',
    tendik: 'jam kerja',
    ortu: 'pekerjaan',
    alumni: 'pekerjaan',
    umum: 'pekerjaan',
  };
  const out = text.replaceAll('{kamu}', kamu).replaceAll('{tugas}', tugas[role ?? 'siswa']);
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** Nama panggilan: nama depan untuk siswa & alumni, selain itu "Bapak/Ibu". */
export function greetingName(name: string, role: Role): string {
  if (role === 'siswa' || role === 'alumni') return name.split(/\s+/)[0] ?? name;
  return 'Bapak/Ibu';
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
  const out = text.replaceAll('{kamu}', 'Anda').replaceAll('{tugas}', 'kegiatan sehari-hari');
  return out.charAt(0).toUpperCase() + out.slice(1);
}
