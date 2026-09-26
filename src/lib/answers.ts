import type { AnswerValue, QSettings, Question } from './types';

/** Penanda jawaban "Lainnya" yang diketik sendiri selama mengisi (dibuang sebelum disimpan). */
export const OTHER = 'lainnya::';
export const isOther = (s: string) => s.startsWith(OTHER);
export const otherText = (s: string) => s.slice(OTHER.length);
export const makeOther = (t: string) => OTHER + t;

export const otherLabel = (s: QSettings | undefined) => s?.other_label?.trim() || 'Lainnya, tuliskan';
export const startLabel = (s: QSettings | undefined) => s?.start_label?.trim() || 'Mulai';
export const endLabel = (s: QSettings | undefined) => s?.end_label?.trim() || 'sampai';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const INT_RE = /^-?\d+$/;

/** Apakah pertanyaan sudah dijawab (tanpa memeriksa benar/salah format). */
export function filled(q: Pick<Question, 'type'>, v: AnswerValue | undefined): boolean {
  if (v === undefined) return false;
  if (q.type === 'range') return Array.isArray(v) && v.length === 2 && !!v[0]?.trim() && !!v[1]?.trim();
  if (Array.isArray(v)) return v.some((x) => (isOther(x) ? !!otherText(x).trim() : !!x.trim()));
  if (isOther(v)) return !!otherText(v).trim();
  return !!v.trim();
}

/** Pesan kesalahan bila isian tidak valid; null bila aman (termasuk bila kosong). */
export function problem(q: Pick<Question, 'type' | 'settings'>, v: AnswerValue | undefined): string | null {
  if (v === undefined) return null;
  const hasEmptyOther = (Array.isArray(v) ? v : [v]).some((x) => isOther(x) && !otherText(x).trim());
  if (hasEmptyOther) return 'Tuliskan jawaban lainnya.';

  if (q.type === 'date' && typeof v === 'string' && v) {
    if (!DATE_RE.test(v) || Number.isNaN(new Date(v + 'T00:00:00Z').getTime())) return 'Tanggal tidak valid.';
  }
  if (q.type === 'range' && Array.isArray(v)) {
    const [a = '', b = ''] = v.map((x) => x.trim());
    if (!a && !b) return null;
    if (!a || !b) return 'Lengkapi kedua angka.';
    if (!INT_RE.test(a) || !INT_RE.test(b)) return 'Isi dengan angka bulat.';
    const x = Number(a), y = Number(b);
    if (x > y) return 'Angka awal tidak boleh lebih besar dari angka akhir.';
    const { min, max } = q.settings ?? {};
    if (typeof min === 'number' && x < min) return `Angka paling kecil ${min}.`;
    if (typeof max === 'number' && y > max) return `Angka paling besar ${max}.`;
  }
  return null;
}

export function formatDateId(v: string): string {
  if (!DATE_RE.test(v)) return v;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(v + 'T00:00:00Z'));
}

/** Teks jawaban untuk ditampilkan (halaman periksa, obrolan, unduhan). */
export function fmtAnswer(q: Pick<Question, 'type' | 'settings'>, v: AnswerValue | undefined): string {
  if (!filled(q, v) || v === undefined) return '—';
  const one = (x: string) => (isOther(x) ? otherText(x).trim() : x);
  if (q.type === 'range' && Array.isArray(v)) return `${startLabel(q.settings)} ${v[0]} ${endLabel(q.settings)} ${v[1]}`;
  if (q.type === 'date' && typeof v === 'string') return formatDateId(v);
  if (Array.isArray(v)) return v.map(one).filter((x) => x.trim()).join(', ');
  return one(v);
}
