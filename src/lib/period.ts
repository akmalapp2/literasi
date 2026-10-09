/** Mode pengisian berulang per angket. */
export type RepeatMode = 'sekali' | 'mingguan' | 'harian';

export const REPEAT_LABEL: Record<RepeatMode, string> = {
  sekali: 'Sekali saja',
  mingguan: 'Sekali setiap minggu',
  harian: 'Sekali setiap hari',
};

/** Kata periode untuk pesan, mis. "minggu ini". */
export const PERIOD_WORD: Record<RepeatMode, string> = {
  sekali: '',
  mingguan: 'minggu ini',
  harian: 'hari ini',
};

const TZ = 'Asia/Makassar';

/** Tanggal WITA (tahun, bulan, hari, hari-dalam-minggu 0=Minggu). */
function witaParts(d: Date) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return { y: Number(g('year')), m: Number(g('month')), d: Number(g('day')), dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')) };
}
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Kunci periode — HARUS sama persis dengan fungsi SQL public.period_key. Minggu dimulai Senin. */
export function periodKey(mode: RepeatMode | null | undefined, at: Date | string = new Date()): string {
  const date = typeof at === 'string' ? new Date(at) : at;
  if (mode === 'harian') {
    const { y, m, d } = witaParts(date);
    return 'D' + iso(y, m, d);
  }
  if (mode === 'mingguan') {
    const { y, m, d, dow } = witaParts(date);
    const back = (dow + 6) % 7; // Senin=0
    const mon = new Date(Date.UTC(y, m - 1, d - back));
    return 'W' + iso(mon.getUTCFullYear(), mon.getUTCMonth() + 1, mon.getUTCDate());
  }
  return 'sekali';
}

/** Apakah token sudah dipakai pada periode sekarang. */
export function usedThisPeriod(mode: RepeatMode | null | undefined, usedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!usedAt) return false;
  return periodKey(mode, usedAt) === periodKey(mode, now);
}

/** Keterangan periode untuk tampilan, mis. "Minggu 5–11 Okt 2026" atau "9 Okt 2026". */
export function periodLabel(key: string): string {
  const fmt = (s: string, opt: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('id-ID', { ...opt, timeZone: 'UTC' }).format(new Date(s + 'T00:00:00Z'));
  if (key.startsWith('D')) return fmt(key.slice(1), { day: 'numeric', month: 'short', year: 'numeric' });
  if (key.startsWith('W')) {
    const start = key.slice(1);
    const end = new Date(new Date(start + 'T00:00:00Z').getTime() + 6 * 86400000).toISOString().slice(0, 10);
    return `Minggu ${fmt(start, { day: 'numeric', month: 'short' })} – ${fmt(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return 'Sekali';
}

/**
 * Rentang waktu periode yang sedang berjalan (UTC ISO), dihitung dari mode SAAT INI.
 * Dipakai untuk menghitung "sudah mengisi minggu ini" berdasarkan waktu kirim, sehingga
 * tetap benar walaupun mode pengisian pernah diganti. null untuk mode "sekali".
 */
export function periodRange(mode: RepeatMode | null | undefined, now: Date = new Date()): { start: string; end: string } | null {
  if (mode !== 'mingguan' && mode !== 'harian') return null;
  const key = periodKey(mode, now);
  const start = new Date(`${key.slice(1)}T00:00:00+08:00`);
  const end = new Date(start.getTime() + (mode === 'mingguan' ? 7 : 1) * 86400000);
  return { start: start.toISOString(), end: end.toISOString() };
}
