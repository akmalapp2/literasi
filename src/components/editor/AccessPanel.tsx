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
  { v: 'token', title: 'Link / QR pribadi', tag: 'Disarankan', text: 'Tiap responden punya link unik. Tanpa pilih peran; nama & peran terisi otomatis.' },
  { v: 'umum', title: 'Link umum', text: 'Satu link untuk semua. Responden memilih peran, lalu mengisi NIT/NIP dan/atau kode angket sesuai pengaturan di bawah.' },
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

        {meta.access_mode === 'umum' && (
          <div className="border-start border-3 border-warning bg-warning-subtle rounded-end p-3 mt-2">
            <div className="small fw-semibold mb-2">Identitas (NIT/NIP)</div>
            {(
              [
                ['semua', 'Semua peran wajib nomor induk', 'Siswa mengisi NIT, guru & kepala sekolah mengisi NIP/NUPTK. Masyarakat Umum tetap anonim.'],
                ['siswa', 'Hanya siswa wajib NIT', 'Peran lain mengisi tanpa identitas (dicegah isi ganda per perangkat).'],
                ['none', 'Tidak ada (anonim)', 'Semua mengisi tanpa identitas. Cocok untuk survei bebas.'],
              ] as const
            ).map(([v, t, d]) => (
              <div className="form-check mb-1" key={v}>
                <input className="form-check-input" type="radio" name="openid" id={`oid-${v}`} checked={meta.open_id === v} onChange={() => setMeta({ open_id: v })} />
                <label className="form-check-label" htmlFor={`oid-${v}`}>
                  <span className="fw-semibold">{t}</span>
                  <br />
                  <span className="small text-secondary">{d}</span>
                </label>
              </div>
            ))}

            <hr className="my-3" />
            <div className="form-check form-switch mb-1">
              <input className="form-check-input" type="checkbox" id="wajibKode" checked={meta.require_code}
                onChange={(e) => setMeta({ require_code: e.target.checked, access_code: e.target.checked && !meta.access_code ? randomCode() : meta.access_code })} />
              <label className="form-check-label fw-semibold" htmlFor="wajibKode">Wajib kode angket</label>
            </div>
            <div className="small text-secondary mb-2">
              Kata sandi bersama yang diumumkan guru di kelas. Orang yang hanya tahu NIT/NIP orang lain tidak bisa masuk tanpa kode ini.
              Ganti kode secara berkala (misalnya tiap Jumat) agar kode lama tidak berlaku.
            </div>
            {meta.require_code && (
              <div className="input-group" style={{ maxWidth: 320 }}>
                <input id="kode" className="form-control text-uppercase fw-semibold" value={meta.access_code ?? ''} maxLength={30} aria-label="Kode angket"
                  onChange={(e) => setMeta({ access_code: e.target.value.toUpperCase() || null })} />
                <button type="button" className="btn btn-outline-secondary" onClick={() => setMeta({ access_code: randomCode() })}>Buat acak</button>
                <CopyButton text={meta.access_code ?? ''} className="btn btn-outline-secondary" />
              </div>
            )}
          </div>
        )}
        {meta.access_mode === 'token' && (
          <Link href={`/admin/angket/${formId}/responden`} className="btn btn-outline-primary mt-2">
            <i className="bi bi-link-45deg me-1" />Kelola link &amp; kartu QR responden
          </Link>
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
        <h2 className="h6 fw-bold mb-1">Pengisian berulang</h2>
        <p className="small text-secondary mb-3">Berapa kali satu orang (satu NIT/NIP) boleh mengisi angket ini.</p>
        {(
          [
            ['sekali', 'Sekali saja', 'Satu orang hanya bisa mengisi satu kali selamanya.'],
            ['mingguan', 'Sekali setiap minggu', 'Bisa diisi lagi tiap minggu (Senin–Minggu). Cocok dengan jadwal "Setiap Jumat". Jawaban minggu-minggu sebelumnya tetap tersimpan.'],
            ['harian', 'Sekali setiap hari', 'Bisa diisi lagi setiap hari. Jawaban hari-hari sebelumnya tetap tersimpan.'],
          ] as const
        ).map(([v, t, d]) => (
          <div key={v} className="form-check border rounded-3 p-3 ps-5 mb-2">
            <input className="form-check-input" type="radio" name="repeat" id={`rep-${v}`} checked={meta.repeat_mode === v}
              onChange={() => setMeta({ repeat_mode: v })} />
            <label className="form-check-label w-100" htmlFor={`rep-${v}`}>
              <span className="fw-semibold">{t}</span>
              <br />
              <span className="small text-secondary">{d}</span>
            </label>
          </div>
        ))}
        {meta.repeat_mode !== 'sekali' && (
          <div className="alert alert-info small py-2 mt-2 mb-0">
            <i className="bi bi-arrow-repeat me-1" />
            Link/QR pribadi tetap sama dan bisa dipakai lagi {meta.repeat_mode === 'mingguan' ? 'minggu' : 'hari'} berikutnya.
            Hasil per {meta.repeat_mode === 'mingguan' ? 'minggu' : 'hari'} bisa diunduh lewat <strong>Unduh hasil</strong> dengan saringan tanggal.
          </div>
        )}
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
