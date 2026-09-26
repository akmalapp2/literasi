import type { FormRow } from './types';

export type WindowState =
  | { open: true }
  | { open: false; title: string; text: string };

type Sched = Pick<FormRow, 'status' | 'opens_at' | 'closes_at'> &
  Partial<Pick<FormRow, 'open_days' | 'open_time' | 'close_time'>>;

/** Zona waktu sekolah (Kepulauan Selayar, WITA). */
export const SCHOOL_TZ = 'Asia/Makassar';

/** Nama hari, indeks 0=Minggu … 6=Sabtu. */
export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
/** Urutan tampil di formulir: Senin dulu. */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Hari (0–6) dan menit sejak tengah malam, menurut waktu WITA. */
export function nowInSchool(date = new Date()): { dow: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { dow, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** Kalimat jadwal mingguan, mis. "setiap Jumat, pukul 07.00–15.00 WITA". Kosong jika tanpa jadwal. */
export function scheduleText(form: Partial<Pick<FormRow, 'open_days' | 'open_time' | 'close_time'>>): string {
  const days = [...(form.open_days ?? [])].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const o = hhmm(form.open_time), c = hhmm(form.close_time);
  let dayText = '';
  if (days.length && days.length < 7) {
    const names = days.map((d) => DAY_NAMES[d]);
    dayText = 'setiap ' + (names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' dan ' + names[names.length - 1]);
  } else if (o || c) dayText = 'setiap hari';
  const fmt = (t: string) => t.replace(':', '.');
  const timeText = o && c ? `pukul ${fmt(o)}–${fmt(c)} WITA` : o ? `mulai pukul ${fmt(o)} WITA` : c ? `sampai pukul ${fmt(c)} WITA` : '';
  return [dayText, timeText].filter(Boolean).join(', ');
}

/** Apakah angket sedang bisa diisi. */
export function formWindow(form: Sched): WindowState {
  const now = Date.now();
  if (form.status === 'draf') return { open: false, title: 'Angket belum dibuka', text: 'Angket ini masih disiapkan oleh admin sekolah.' };
  if (form.status === 'ditutup') return { open: false, title: 'Angket sudah ditutup', text: 'Terima kasih atas perhatiannya. Pengisian sudah berakhir.' };
  if (form.opens_at && now < new Date(form.opens_at).getTime())
    return { open: false, title: 'Angket belum dibuka', text: 'Silakan kembali saat jadwal pengisian dimulai.' };
  if (form.closes_at && now > new Date(form.closes_at).getTime())
    return { open: false, title: 'Angket sudah ditutup', text: 'Batas waktu pengisian sudah lewat.' };

  const sched = scheduleText(form);
  const again = sched ? `Angket ini dibuka ${sched}. Silakan kembali pada jadwal tersebut.` : '';
  const { dow, minutes } = nowInSchool();
  const days = form.open_days ?? [];
  if (days.length && days.length < 7 && !days.includes(dow))
    return { open: false, title: 'Belum waktunya mengisi', text: again };
  const o = hhmm(form.open_time), c = hhmm(form.close_time);
  if (o && minutes < toMin(o)) return { open: false, title: 'Belum waktunya mengisi', text: again };
  if (c && minutes > toMin(c)) return { open: false, title: 'Pengisian hari ini sudah selesai', text: again };
  return { open: true };
}

/** Apakah hasil angket boleh tampil di halaman publik. */
export function resultsVisible(form: Pick<FormRow, 'status' | 'closes_at' | 'public_results' | 'results_after_close'>): boolean {
  if (!form.public_results || form.status === 'draf') return false;
  if (form.results_after_close) {
    return form.status === 'ditutup' || (!!form.closes_at && Date.now() > new Date(form.closes_at).getTime());
  }
  return true;
}
