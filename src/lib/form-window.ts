import type { FormRow } from './types';

export type WindowState =
  | { open: true }
  | { open: false; title: string; text: string };

/** Apakah angket sedang bisa diisi. */
export function formWindow(form: Pick<FormRow, 'status' | 'opens_at' | 'closes_at'>): WindowState {
  const now = Date.now();
  if (form.status === 'draf') return { open: false, title: 'Angket belum dibuka', text: 'Angket ini masih disiapkan oleh admin sekolah.' };
  if (form.status === 'ditutup') return { open: false, title: 'Angket sudah ditutup', text: 'Terima kasih atas perhatiannya. Pengisian sudah berakhir.' };
  if (form.opens_at && now < new Date(form.opens_at).getTime())
    return { open: false, title: 'Angket belum dibuka', text: 'Silakan kembali saat jadwal pengisian dimulai.' };
  if (form.closes_at && now > new Date(form.closes_at).getTime())
    return { open: false, title: 'Angket sudah ditutup', text: 'Batas waktu pengisian sudah lewat.' };
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
