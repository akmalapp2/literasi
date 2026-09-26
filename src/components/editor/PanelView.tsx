'use client';

import { TYPE_ICON, isChoice } from '@/lib/text';
import type { Brand, FillDesign, FormMeta, Question } from '@/lib/types';
import PhonePreview from './PhonePreview';
import { OptionsEditor, RoleChips, RoleDots, TypeChips, type QOps } from './shared';

type Props = {
  meta: FormMeta;
  setMeta: (p: Partial<FormMeta>) => void;
  qs: Question[];
  ops: QOps;
  sel: number;
  setSel: (i: number) => void;
  brand: Brand;
  design: FillDesign;
  setDesign: (d: FillDesign) => void;
};

/** Tampilan editor 2: daftar + form edit + pratinjau HP. */
export default function PanelView({ meta, setMeta, qs, ops, sel, setSel, brand, design, setDesign }: Props) {
  const n = qs.length;
  const i = Math.min(sel, n - 1);
  const q = i >= 0 ? qs[i] : null;

  return (
    <div className="row g-3">
      {/* Daftar pertanyaan */}
      <div className="col-md-4 col-xl-3">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-2">
            <button type="button" className={`ol-item ${i === -1 ? 'on' : ''}`} onClick={() => setSel(-1)}>
              <span className="ol-no"><i className="bi bi-info-lg" /></span>
              <span className="ol-t fw-semibold">Info angket</span>
            </button>
            <div className="small text-secondary px-2 pt-2 pb-1">{n} pertanyaan</div>
            {qs.map((x, k) => (
              <button type="button" key={x.id} className={`ol-item ${k === i ? 'on' : ''}`} onClick={() => setSel(k)}>
                <span className="ol-no">{k + 1}</span>
                <i className={`bi ${TYPE_ICON[x.type]} text-secondary`} />
                <span className="ol-t">{x.title || <em className="text-secondary">Tanpa teks</em>}</span>
                {x.required && <span className="req small">*</span>}
                <RoleDots roles={x.roles} />
              </button>
            ))}
            <button type="button" className="btn btn-sm btn-outline-primary w-100 mt-2" onClick={() => setSel(ops.add(i < 0 ? n - 1 : i))}>
              <i className="bi bi-plus-lg me-1" />Tambah pertanyaan
            </button>
            <div className="d-flex flex-wrap gap-2 small text-secondary px-2 pt-2">
              <span><span className="ol-dots"><span className="kepsek" /></span> Kepsek</span>
              <span><span className="ol-dots"><span className="guru" /></span> Guru</span>
              <span><span className="ol-dots"><span className="siswa" /></span> Siswa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form edit */}
      <div className="col-md-8 col-xl-5">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-3 p-md-4">
            {!q ? (
              <>
                <h2 className="h6 fw-bold mb-3">Info angket</h2>
                <label className="form-label small fw-semibold" htmlFor="pJudul">Judul</label>
                <input id="pJudul" className="form-control mb-3" value={meta.title} onChange={(e) => setMeta({ title: e.target.value })} />
                <label className="form-label small fw-semibold" htmlFor="pKet">Keterangan pembuka</label>
                <textarea id="pKet" className="form-control mb-3" rows={3} value={meta.description} onChange={(e) => setMeta({ description: e.target.value })} />
                <div className="small fw-semibold mb-2">Sasaran angket</div>
                <div className="d-flex flex-wrap gap-2">
                  <RoleChips value={meta.targets} onChange={(v) => setMeta({ targets: v })} />
                </div>
              </>
            ) : (
              <>
                <div className="d-flex align-items-center mb-3">
                  <span className="small fw-semibold text-secondary">Pertanyaan {i + 1} dari {n}</span>
                  <div className="ms-auto btn-group btn-group-sm">
                    <button type="button" className="btn btn-light" title="Naikkan" aria-label="Naikkan" disabled={i === 0} onClick={() => { ops.move(i, -1); setSel(i - 1); }}>
                      <i className="bi bi-arrow-up" />
                    </button>
                    <button type="button" className="btn btn-light" title="Turunkan" aria-label="Turunkan" disabled={i === n - 1} onClick={() => { ops.move(i, 1); setSel(i + 1); }}>
                      <i className="bi bi-arrow-down" />
                    </button>
                    <button type="button" className="btn btn-light" title="Duplikat" aria-label="Duplikat" onClick={() => { ops.duplicate(i); setSel(i + 1); }}>
                      <i className="bi bi-copy" />
                    </button>
                    <button type="button" className="btn btn-light text-danger" title="Hapus" aria-label="Hapus pertanyaan" onClick={() => { ops.remove(i); setSel(Math.max(0, i - 1)); }}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
                <label className="form-label small fw-semibold" htmlFor="pTitle">Teks pertanyaan</label>
                <textarea id="pTitle" className="form-control" rows={2} value={q.title} onChange={(e) => ops.update(i, { title: e.target.value })} />
                <div className="form-text mb-3">
                  Tulis <code>{'{kamu}'}</code> agar otomatis menjadi &quot;kamu&quot; untuk siswa dan &quot;Bapak/Ibu&quot; untuk guru &amp; kepala sekolah.
                </div>
                <div className="small fw-semibold mb-2">Jenis jawaban</div>
                <div className="mb-3"><TypeChips value={q.type} onChange={(t) => ops.setType(i, t)} /></div>
                {isChoice(q.type) ? (
                  <div className="mb-2">
                    <div className="small fw-semibold mb-2">Opsi jawaban</div>
                    <OptionsEditor q={q} compact onChange={(o) => ops.update(i, { options: o })} />
                  </div>
                ) : (
                  <div className="small text-secondary mb-3">
                    <i className="bi bi-info-circle me-1" />
                    {q.type === 'short' ? 'Responden mengetik jawaban satu baris.' : 'Responden menulis jawaban beberapa kalimat.'}
                  </div>
                )}
                <div className="d-flex flex-wrap gap-2 align-items-center my-3 pt-3 border-top">
                  <span className="small fw-semibold me-1">Tampil untuk</span>
                  <RoleChips value={q.roles} onChange={(v) => ops.update(i, { roles: v })} />
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="pReq" checked={q.required} onChange={(e) => ops.update(i, { required: e.target.checked })} />
                  <label className="form-check-label" htmlFor="pReq">Wajib diisi</label>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pratinjau */}
      <div className="col-12 col-xl-4">
        <div className="prev-sticky">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="small fw-semibold text-secondary">Pratinjau di HP</span>
            <div className="btn-group btn-group-sm ms-auto" role="group" aria-label="Desain pratinjau">
              {(['A', 'B'] as FillDesign[]).map((d) => (
                <button type="button" key={d} className={`btn btn-outline-primary ${design === d ? 'active' : ''}`} onClick={() => setDesign(d)}>
                  Desain {d}
                </button>
              ))}
            </div>
          </div>
          <PhonePreview brand={brand} q={q} index={i} total={n} design={design} title={meta.title} />
        </div>
      </div>
    </div>
  );
}
