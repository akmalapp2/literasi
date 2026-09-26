import type { Metadata } from 'next';
import { saveSettings } from '@/actions/settings';
import { requireAdmin } from '@/lib/auth';
import { getSettings, toBrand } from '@/lib/settings';

export const metadata: Metadata = { title: 'Pengaturan' };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; e?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const s = await getSettings();
  const brand = toBrand(s);

  return (
    <div className="p-3 p-lg-4" style={{ maxWidth: 960 }}>
      <h1 className="h3 page-title mb-1">Pengaturan</h1>
      <p className="text-secondary">Nama aplikasi, logo, dan tampilan. Berlaku untuk seluruh aplikasi.</p>
      {sp.ok && <div className="alert alert-success py-2">Pengaturan tersimpan.</div>}
      {sp.e && <div className="alert alert-danger py-2">{sp.e}</div>}

      <form action={saveSettings}>
        <div className="card border-0 shadow-sm mb-3"><div className="card-body p-3 p-md-4">
          <h2 className="h6 fw-bold mb-1">Nama aplikasi &amp; logo</h2>
          <p className="small text-secondary mb-3">Tampil di menu samping admin, halaman login, halaman responden, kartu QR, dan tab browser.</p>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold" htmlFor="an">Nama aplikasi</label>
              <input id="an" name="app_name" className="form-control" defaultValue={s.app_name} maxLength={80} required placeholder="Angket SMKN 3 Kepulauan Selayar" />
              <div className="form-text">Contoh: Angket SMKN 3 Kepulauan Selayar</div>
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold" htmlFor="sn">Nama sekolah</label>
              <input id="sn" name="school_name" className="form-control" defaultValue={s.school_name} maxLength={80} />
            </div>
            <div className="col-md-8">
              <label className="form-label small fw-semibold" htmlFor="lg">Ganti logo (PNG/JPG/SVG, maks. 900 KB)</label>
              <input id="lg" name="logo" type="file" accept="image/*" className="form-control" />
              {s.logo_url && (
                <div className="form-check mt-2">
                  <input className="form-check-input" type="checkbox" name="reset_logo" id="rl" />
                  <label className="form-check-label small" htmlFor="rl">Kembalikan ke logo bawaan SMKN 3 Kepulauan Selayar</label>
                </div>
              )}
            </div>
            <div className="col-md-4 d-flex align-items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={brand.logo} width={56} height={52} alt="Logo saat ini" className="logo" />
              <span className="small text-secondary">Logo saat ini, tampil di semua halaman.</span>
            </div>
          </div>
        </div></div>

        <div className="card border-0 shadow-sm mb-3"><div className="card-body p-3 p-md-4">
          <h2 className="h6 fw-bold mb-1">Desain editor pertanyaan (admin)</h2>
          <p className="small text-secondary mb-3">Tampilan bawaan saat admin membuka editor. Tetap bisa diganti sementara lewat tombol di atas editor.</p>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="opt-card">
                <input className="form-check-input" type="radio" name="editor_view" value="kartu" defaultChecked={s.editor_view === 'kartu'} />
                <div className="thumb thumb-k"><b className="on" /><b /><b /></div>
                <div className="fw-bold">1. Kartu</div>
                <div className="small text-secondary">Kartu berurutan seperti Google Form. Paling akrab bagi yang sudah terbiasa.</div>
              </label>
            </div>
            <div className="col-md-6">
              <label className="opt-card">
                <input className="form-check-input" type="radio" name="editor_view" value="panel" defaultChecked={s.editor_view !== 'kartu'} />
                <div className="thumb thumb-p"><i /><b /><s /></div>
                <div className="fw-bold">2. Panel + pratinjau HP <span className="badge text-bg-warning ms-1">Disarankan</span></div>
                <div className="small text-secondary">Daftar di kiri, edit di tengah, pratinjau HP di kanan. Terlihat langsung tampilan di HP siswa.</div>
              </label>
            </div>
          </div>
        </div></div>

        <div className="card border-0 shadow-sm mb-3"><div className="card-body p-3 p-md-4">
          <h2 className="h6 fw-bold mb-1">Desain halaman isi (responden)</h2>
          <p className="small text-secondary mb-3">Bawaan untuk semua angket. Tiap angket bisa memilih desain sendiri di tab Akses &amp; pengaturan.</p>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="opt-card">
                <input className="form-check-input" type="radio" name="default_fill_design" value="A" defaultChecked={s.default_fill_design !== 'B'} />
                <div className="thumb thumb-a"><i /><b className="on" /><b /><b /></div>
                <div className="fw-bold">A. Fokus satu per satu <span className="badge text-bg-warning ms-1">Disarankan</span></div>
                <div className="small text-secondary">Satu pertanyaan per layar, tombol besar, ada halaman periksa sebelum kirim.</div>
              </label>
            </div>
            <div className="col-md-6">
              <label className="opt-card">
                <input className="form-check-input" type="radio" name="default_fill_design" value="B" defaultChecked={s.default_fill_design === 'B'} />
                <div className="thumb thumb-b"><i /><s /><i /><u /></div>
                <div className="fw-bold">B. Obrolan</div>
                <div className="small text-secondary">Seperti chat WhatsApp. Akrab bagi siswa, jawaban bisa diketuk untuk diubah.</div>
              </label>
            </div>
          </div>
        </div></div>

        <button className="btn btn-primary px-4"><i className="bi bi-check2 me-1" />Simpan pengaturan</button>
      </form>
    </div>
  );
}
