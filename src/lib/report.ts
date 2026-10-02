import { endLabel, formatDateId, startLabel } from './answers';
import { ROLE_LABEL } from './text';
import type { QSettings, QType, Role } from './types';

/** Satu baris jawaban untuk laporan. */
export type ReportRow = {
  submitted_at: string;
  name: string | null;
  identifier: string | null;
  role: Role | null;
  class_name: string | null;
  answers: Record<string, string | string[]>;
};
export type ReportQuestion = { id: string; type: QType; title: string; options: string[]; settings: QSettings | null };
export type ReportData = {
  form: { title: string; slug: string; targets: Role[] };
  brand: { appName: string; schoolName: string; logo: string; creator: string };
  questions: ReportQuestion[];
  /** Semua tanggal pengisian (WITA) beserta jumlah jawaban, tanpa saringan. */
  dates: { date: string; n: number }[];
  rows: ReportRow[];
};

export type SummaryLine = { label: string; n: number; pct: number };
export type QuestionSummary = {
  q: ReportQuestion;
  answered: number;
  lines: SummaryLine[];
  note?: string;
  others?: SummaryLine[];
};

const TZ = 'Asia/Makassar';

/** Tanggal WITA "YYYY-MM-DD" dari waktu ISO. */
export function witaDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}
/** "26 Sep 2026 09.15" (WITA). */
export function witaDateTime(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 1000) / 10 : 0);
const filled = (v: string | string[] | undefined) => (Array.isArray(v) ? v.length > 0 : !!v && v.trim() !== '');

/** Teks jawaban untuk tabel. */
export function cellText(q: ReportQuestion, v: string | string[] | undefined): string {
  if (!filled(v) || v === undefined) return '';
  if (q.type === 'range' && Array.isArray(v)) return `${startLabel(q.settings ?? {})} ${v[0]} ${endLabel(q.settings ?? {})} ${v[1]}`;
  if (q.type === 'date' && typeof v === 'string') return formatDateId(v);
  return Array.isArray(v) ? v.join('; ') : v;
}

/** Rekap per pertanyaan dari baris yang sudah disaring. */
export function summarize(questions: ReportQuestion[], rows: ReportRow[]): QuestionSummary[] {
  return questions.map((q) => {
    const vals = rows.map((r) => r.answers[q.id]).filter(filled) as (string | string[])[];
    const answered = vals.length;
    const count = (labels: string[]) => {
      const m = new Map<string, number>();
      for (const l of labels) m.set(l, (m.get(l) ?? 0) + 1);
      return m;
    };

    if (q.type === 'radio' || q.type === 'dropdown' || q.type === 'checkbox') {
      const all = vals.flatMap((v) => (Array.isArray(v) ? v : [v]));
      const m = count(all);
      const lines = q.options.map((o) => ({ label: o, n: m.get(o) ?? 0, pct: pct(m.get(o) ?? 0, answered) }));
      const otherVals = all.filter((x) => !q.options.includes(x));
      if (otherVals.length || q.settings?.allow_other) lines.push({ label: 'Lainnya', n: otherVals.length, pct: pct(otherVals.length, answered) });
      const om = count(otherVals.map((x) => x.trim()));
      const others = [...om.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n, pct: pct(n, answered) }));
      return { q, answered, lines, others, note: q.type === 'checkbox' ? 'Boleh lebih dari satu pilihan; persen dari jumlah yang menjawab.' : undefined };
    }
    if (q.type === 'date') {
      const m = count(vals as string[]);
      const lines = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, n]) => ({ label: formatDateId(d), n, pct: pct(n, answered) }));
      return { q, answered, lines };
    }
    if (q.type === 'short') {
      const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
      const m = count((vals as string[]).map(norm));
      const lines = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([label, n]) => ({ label, n, pct: pct(n, answered) }));
      return { q, answered, lines, note: m.size > 15 ? `Menampilkan 15 dari ${m.size} jawaban berbeda.` : undefined };
    }
    if (q.type === 'range') {
      const pairs = (vals as string[][]).map((v) => [Number(v[0]), Number(v[1])]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
      const spans = pairs.map(([a, b]) => b - a + 1);
      const total = spans.reduce((s, x) => s + x, 0);
      const lines = pairs.length
        ? [
            { label: 'Rata-rata per orang', n: Math.round((total / pairs.length) * 10) / 10, pct: 0 },
            { label: 'Jumlah seluruhnya', n: total, pct: 0 },
            { label: 'Angka awal terkecil', n: Math.min(...pairs.map((p) => p[0])), pct: 0 },
            { label: 'Angka akhir terbesar', n: Math.max(...pairs.map((p) => p[1])), pct: 0 },
          ]
        : [];
      return { q, answered, lines, note: 'Rentang = angka akhir - angka awal + 1.' };
    }
    return { q, answered, lines: [], note: `${answered} jawaban isian panjang. Isi lengkapnya ada di file Excel.` };
  });
}

/** Jumlah jawaban per peran. */
export function roleCounts(rows: ReportRow[]): { role: Role; n: number }[] {
  const m = new Map<Role, number>();
  for (const r of rows) if (r.role) m.set(r.role, (m.get(r.role) ?? 0) + 1);
  return [...m.entries()].map(([role, n]) => ({ role, n }));
}

/** Keterangan saringan, mis. "Tanggal 26 Sep 2026, peran Siswa". */
export function filterLabel(from: string | null, to: string | null, role: Role | null): string {
  const d = from && to ? (from === to ? `tanggal ${formatDateId(from)}` : `${formatDateId(from)} s.d. ${formatDateId(to)}`)
    : from ? `mulai ${formatDateId(from)}` : to ? `sampai ${formatDateId(to)}` : 'semua tanggal';
  return `${d}, ${role ? ROLE_LABEL[role] : 'semua peran'}`;
}
