'use client';

import Link from 'next/link';
import CopyButton from '@/components/CopyButton';
import { DAY_NAMES, DAY_ORDER, scheduleText } from '@/lib/form-window';
import ClearResponses from './ClearResponses';
import type { AccessMode, FillDesign, FormMeta } from '@/lib/types';
import { RoleChips } from './shared';

type Props = {
  formId: string;
  meta: FormMeta;
  setMeta: (p: Partial<FormMeta>) => void;
  baseUrl: string;
  defaultFillDesign: FillDesign;
  responseCount: number;
};

function toLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function fromLocal(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}
function randomCode(): string {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => a[Math.floor(Math.random() * a.length)]).join('');
}

const MODES: { v: AccessMode; title: string; text: string; tag?: string }[] = [
  { v: 'token', title: 'Link / QR pribadi', tag: 'Disarankan', text: 'Tiap responden punya link unik. Tanpa pilih peran, sekali pakai, nama & peran terisi otomatis.' },
  { v: 'kode', title: 'Kode + nomor induk', text: 'Satu link umum. Responden memilih peran, lalu mengetik kode dan nomor induk: NIT untuk siswa, NIP/NUPTK untuk guru & kepala sekolah.' },
  { v: 'terbuka', title: 'Terbuka', text: 'Satu link umum tanpa kode. Responden memilih peran lalu mengisi. Dilindungi Turnstile anti-bot.' },
];

export default function AccessPanel({ formId, meta, setMeta, baseUrl, defaultFillDesign, responseCount }: Props) {
  const entryUrl = `${baseUrl}/f/${meta.slug}`;
  const resultUrl = `${baseUrl}/hasil/${meta.slug}`;

  return (
    <div className="editor-wrap mx-auto d-flex flex-column gap-3">
      <div className="card border-0 shadow-sm"><div className="card-body p-3 p-md-4">
        <h2 className="h6 fw-bold mb-3">Sasaran &amp; cara masuk</h2>
        <div className="small fw-semibold mb-2">Angket ini untuk</div>
        <div className="d-flex flex-wrap gap-2 mb-4">
          <RoleChips value={meta.targets} onChange={(v) => setMeta({ targets: v })} />
        </div>
        {MODES.map((m) => (
          <div key={m.v} className="form-check border rounded-3 p-3 ps-5 mb-2">
            <input className="form-check-input" type="radio" name="mode" id={`mode-${m.v}`} checked={meta.access_mode === m.v} onChange={() => setMeta({ access_mode: m.v })} />
            <label className="form-check-label w-100" htmlFor={`mode-${m.v}`}>
              <span className="fw-semibold">{m.title}</span>
              {m.tag && <span className="badge text-bg-warning ms-2">{m.tag}</span>}
              <br />
              <span className="small text-secondary">{m.text}</span>
            </label>
          </div>
        ))}

        {meta.access_mode === 'terbuka' && (
          <div className="border-start border-3 border-warning bg-warning-subtle rounded-end p-3 mt-2">
            <div className="form-check form-switch mb-1">
              <input className="form-check-input" type="checkbox" id="wajibNit" checked={meta.open_id !== 'none'}
                onChange={(e) => setMeta({ open_id: e.target.checked ? 'siswa' : 'none' })} />
              <label className="form-check-label fw-semibold" htmlFor="wajibNit">Wajib isi NIT untuk siswa</label>
            </div>
            <div className="small text-secondary mb-2">Siswa mengetik NIT (Nomor Induk Taruna) yang terdaftar. Satu NIT hanya bisa mengisi sekali.</div>
            <div className="form-check form-switch mb-1">
              <input className="form-check-input" type="checkbox" id="wajibNip" checked={meta.open_id === 'semua'} disabled={meta.open_id === 'none'}
                onChange={(e) => setMeta({ open_id: e.target.checked ? 'semua' : 'siswa' })} />
              <label className="form-check-label fw-semibold" htmlFor="wajibNip">Wajib isi NIP/NUPTK untuk guru, kepala sekolah &amp; peran lain</label>
            </div>
            <div className="small text-secondary">
              {meta.open_id === 'semua'
                ? 'Semua responden wajib nomor induk, kecuali Masyarakat Umum yang tetap anonim.'
                : 'Jika mati, peran selain siswa mengisi tanpa identitas (dicegah isi ganda per perangkat).'}
            </div>
          </div>
        )}
        {meta.access_mode === 'token' && (
          <Link href={`/admin/angket/${formId}/responden`} className="btn btn-outline-primary mt-2">
            <i className="bi bi-link-45deg me-1" />Kelola link &amp; kartu QR responden
          </Link>
        )}
        {meta.access_mode === 'kode' && (
          <div className="mt-2">
            <label className="form-label small fw-semibold" htmlFor="kode">Kode akses</label>
            <div className="input-group mb-2" style={{ maxWidth: 320 }}>
              <input id="kode" className="form-control text-uppercase" value={meta.access_code ?? ''} maxLength={30}
                onChange={(e) => setMeta({ access_code: e.target.value.toUpperCase() || null })} />
              <button type="button" className="btn btn-outline-secondary" onClick={() => setMeta({ access_code: randomCode() })}>Buat acak</button>
            </div>
          </div>
        )}
        {meta.access_mode !== 'token' && (
          <div className="mt-2">
            <div className="small fw-semibold mb-1">Link untuk dibagikan</div>
            <div className="input-group">
              <input className="form-control" readOnly value={entryUrl} aria-label="Link angket" />
              <CopyButton text={entryUrl} className="btn btn-outline-secondary" />
            </div>
          </div>
        )}
      </div></div>

      <div className="card border-0 shadow-sm"><div className="card-body p-3 p-md-4">
        <h2 className="h6 fw-bold mb-3">Desain halaman isi</h2>
        <select className="form-select mb-2" value={meta.fill_design} aria-label="Desain halaman isi"
          onChange={(e) => setMeta({ fill_design: e.target.value as FormMeta['fill_design'] })}>
          <option value="ikut">Ikuti pengaturan umum (sekarang: Desain {defaultFillDesign})</option>
          <option value="A">Desain A. Fokus satu per satu</option>
          <option value="B">Desain B. Obrolan</option>
        </select>
        <div className="small text-secondary">Desain umum diatur di menu <Link href="/admin/pengaturan">Pengaturan</Link>.</div>
      </div></div>

      <div className="card border-0 shadow-sm"><div className="card-body p-3 p-md-4">
        <h2 className="h6 fw-bold mb-1">Jadwal</h2>
        <p className="small text-secondary mb-3">Semua kolom opsional. Angket hanya bisa diisi saat statusnya Terbit dan sesuai jadwal di bawah.</p>

        <div className="small fw-semibold mb-1">1. Periode</div>
        <div className="row g-3 mb-4">
          <div className="col-sm-6">
            <label className="form-label small" htmlFor="buka">Mulai tanggal</label>
            <input id="buka" type="datetime-local" className="form-control" value={toLocal(meta.opens_at)} onChange={(e) => setMeta({ opens_at: fromLocal(e.target.value) })} />
          </div>
          <div className="col-sm-6">
            <label className="form-label small" htmlFor="tutup">Sampai tanggal</label>
            <input id="tutup" type="datetime-local" className="form-control" value={toLocal(meta.closes_at)} onChange={(e) => setMeta({ closes_at: fromLocal(e.target.value) })} />
          </div>
        </div>

        <div className="small fw-semibold mb-1">2. Hari buka setiap minggu</div>
        <div className="d-flex flex-wrap gap-2 mb-2" role="group" aria-label="Hari buka">
          {DAY_ORDER.map((d) => {
            const on = meta.open_days.includes(d);
            return (
              <button type="button" key={d} className={`chip-role ${on ? 'on' : ''}`} aria-pressed={on}
                onClick={() => setMeta({ open_days: on ? meta.open_days.filter((x) => x !== d) : [...meta.open_days, d] })}>
                {DAY_NAMES[d]}
              </button>
            );
          })}
        </div>
        <div className="d-flex flex-wrap gap-3 small mb-4">
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setMeta({ open_days: [5] })}>Setiap Jumat</button>
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setMeta({ open_days: [1, 2, 3, 4, 5] })}>Hari sekolah (Senin–Jumat)</button>
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setMeta({ open_days: [] })}>Setiap hari</button>
        </div>

        <div className="small fw-semibold mb-1">3. Jam buka (WITA)</div>
        <div className="row g-3">
          <div className="col-6 col-sm-4">
            <label className="form-label small" htmlFor="jamBuka">Dari jam</label>
            <input id="jamBuka" type="time" className="form-control" value={meta.open_time ?? ''} onChange={(e) => setMeta({ open_time: e.target.value || null })} />
          </div>
          <div className="col-6 col-sm-4">
            <label className="form-label small" htmlFor="jamTutup">Sampai jam</label>
            <input id="jamTutup" type="time" className="form-control" value={meta.close_time ?? ''} onChange={(e) => setMeta({ close_time: e.target.value || null })} />
          </div>
        </div>

        <div className="alert alert-info small py-2 mt-3 mb-0">
          <i className="bi bi-calendar-week me-1" />
          {scheduleText(meta)
            ? <>Angket dibuka <strong>{scheduleText(meta)}</strong>. Di luar jadwal ini, responden melihat pesan &quot;Belum waktunya mengisi&quot;.</>
            : <>Tanpa jadwal mingguan: angket bisa diisi kapan saja selama statusnya Terbit.</>}
        </div>
      </div></div>

      <div className="card border-0 shadow-sm"><div className="card-body p-3 p-md-4">
        <h2 className="h6 fw-bold mb-3">Hasil publik</h2>
        <div className="form-check form-switch mb-2">
          <input className="form-check-input" type="checkbox" id="pub" checked={meta.public_results} onChange={(e) => setMeta({ public_results: e.target.checked })} />
          <label className="form-check-label" htmlFor="pub">Tampilkan hasil di halaman publik</label>
        </div>
        <div className="form-check form-switch mb-2">
          <input className="form-check-input" type="checkbox" id="hide" checked={meta.hide_text_public} onChange={(e) => setMeta({ hide_text_public: e.target.checked })} />
          <label className="form-check-label" htmlFor="hide">Sembunyikan jawaban isian (singkat &amp; panjang) dari publik</label>
        </div>
        <div className="form-check form-switch mb-3">
          <input className="form-check-input" type="checkbox" id="after" checked={meta.results_after_close} onChange={(e) => setMeta({ results_after_close: e.target.checked })} />
          <label className="form-check-label" htmlFor="after">Tampilkan hasil publik hanya setelah angket ditutup</label>
        </div>
        <label className="form-label small fw-semibold" htmlFor="slug">Alamat angket</label>
        <div className="input-group mb-2">
          <span className="input-group-text small">/hasil/</span>
          <input id="slug" className="form-control" value={meta.slug}
            onChange={(e) => setMeta({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })} />
        </div>
        <div className="input-group">
          <input className="form-control" readOnly value={resultUrl} aria-label="Link hasil publik" />
          <CopyButton text={resultUrl} className="btn btn-outline-secondary" />
          <a className="btn btn-outline-secondary" href={resultUrl} target="_blank" rel="noreferrer" title="Buka"><i className="bi bi-box-arrow-up-right" /></a>
        </div>
      </div></div>
      <ClearResponses formId={formId} count={responseCount} />
    </div>
  );
}
