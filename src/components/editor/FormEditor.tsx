'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { saveForm } from '@/actions/forms';
import { Logo } from '@/components/Brand';
import Toast, { type ToastMsg } from '@/components/Toast';
import { isChoice } from '@/lib/text';
import type { Brand, EditorView, FillDesign, FormMeta, FormRow, Question } from '@/lib/types';
import AccessPanel from './AccessPanel';
import CardsView from './CardsView';
import PanelView from './PanelView';
import { uid, type QOps } from './shared';

type Props = {
  form: FormRow;
  initialQuestions: Question[];
  brand: Brand;
  defaultView: EditorView;
  defaultFillDesign: FillDesign;
  responseCount: number;
  baseUrl: string;
};

function toMeta(f: FormRow): FormMeta {
  return {
    title: f.title, description: f.description, slug: f.slug, targets: f.targets, status: f.status,
    access_mode: f.access_mode, access_code: f.access_code, fill_design: f.fill_design,
    opens_at: f.opens_at, closes_at: f.closes_at, public_results: f.public_results,
    hide_text_public: f.hide_text_public, results_after_close: f.results_after_close,
  };
}

const VIEWS: { v: EditorView; label: string; icon: string }[] = [
  { v: 'kartu', label: '1. Kartu', icon: 'bi-card-list' },
  { v: 'panel', label: '2. Panel + pratinjau', icon: 'bi-layout-three-columns' },
];

export default function FormEditor({ form, initialQuestions, brand, defaultView, defaultFillDesign, responseCount, baseUrl }: Props) {
  const [meta, setMetaState] = useState<FormMeta>(() => toMeta(form));
  const [qs, setQsState] = useState<Question[]>(initialQuestions);
  const [view, setView] = useState<EditorView>(defaultView);
  const [tab, setTab] = useState<'pertanyaan' | 'akses'>('pertanyaan');
  const [active, setActive] = useState(0);
  const [sel, setSel] = useState(0);
  const [pvDesign, setPvDesign] = useState<FillDesign>(form.fill_design === 'ikut' ? defaultFillDesign : form.fill_design);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<ToastMsg>(null);
  const [saving, startSaving] = useTransition();

  const setMeta = (patch: Partial<FormMeta>) => {
    setMetaState((m) => ({ ...m, ...patch }));
    setDirty(true);
  };
  const setQs = (fn: (p: Question[]) => Question[]) => {
    setQsState(fn);
    setDirty(true);
  };

  const ops: QOps = {
    update: (i, patch) => setQs((p) => p.map((q, j) => (j === i ? { ...q, ...patch } : q))),
    setType: (i, t) =>
      setQs((p) => p.map((q, j) => (j !== i ? q : { ...q, type: t, options: isChoice(t) && q.options.length < 2 ? ['Opsi 1', 'Opsi 2'] : q.options }))),
    add: (after) => {
      const nq: Question = { id: uid(), type: 'radio', title: 'Pertanyaan baru', required: false, roles: [...meta.targets], options: ['Opsi 1', 'Opsi 2'] };
      setQs((p) => {
        const c = [...p];
        c.splice(after + 1, 0, nq);
        return c;
      });
      return after + 1;
    },
    duplicate: (i) =>
      setQs((p) => {
        const c = [...p];
        c.splice(i + 1, 0, { ...p[i], id: uid(), options: [...p[i].options], roles: [...p[i].roles] });
        return c;
      }),
    remove: (i) => {
      if (qs.length < 2) {
        setMsg({ type: 'error', text: 'Angket butuh minimal satu pertanyaan.' });
        return;
      }
      if (responseCount > 0 && !window.confirm('Angket ini sudah punya jawaban. Jawaban untuk pertanyaan ini ikut terhapus saat disimpan. Lanjutkan?')) return;
      setQs((p) => p.filter((_, j) => j !== i));
    },
    move: (i, d) =>
      setQs((p) => {
        const j = i + d;
        if (j < 0 || j >= p.length) return p;
        const c = [...p];
        [c[i], c[j]] = [c[j], c[i]];
        return c;
      }),
  };

  const save = useCallback(() => {
    startSaving(async () => {
      const r = await saveForm(form.id, meta, qs);
      if (r.ok) {
        setDirty(false);
        setMsg({ type: 'ok', text: r.message ?? 'Tersimpan.' });
      } else setMsg({ type: 'error', text: r.error });
    });
  }, [form.id, meta, qs]);

  // Ctrl/Cmd + S untuk menyimpan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  // Peringatan jika menutup halaman sebelum menyimpan
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  const statusClass = meta.status === 'terbit' ? 'st-terbit' : meta.status === 'draf' ? 'st-draf' : 'st-ditutup';

  return (
    <div>
      <div className="bg-white border-bottom">
        <div className="px-3 px-lg-4 py-2 d-flex flex-wrap align-items-center gap-2">
          <Link href="/admin" className="btn btn-sm btn-link px-1" aria-label="Kembali ke daftar angket" title="Kembali">
            <i className="bi bi-arrow-left fs-5" />
          </Link>
          <Logo brand={brand} size={34} alt={`Logo ${brand.schoolName}`} />
          <div className="me-2 flex-grow-1 min-w-0">
            <div className="fw-bold lh-sm text-truncate">{meta.title || 'Tanpa judul'}</div>
            <div className="small text-secondary">{dirty ? 'Ada perubahan yang belum disimpan' : 'Semua perubahan tersimpan'}</div>
          </div>
          <select className={`form-select form-select-sm w-auto fw-semibold ${statusClass}`} value={meta.status} aria-label="Status angket"
            onChange={(e) => setMeta({ status: e.target.value as FormMeta['status'] })}>
            <option value="draf">Draf</option>
            <option value="terbit">Terbit</option>
            <option value="ditutup">Ditutup</option>
          </select>
          <Link
            className="btn btn-sm btn-outline-secondary"
            href={`/admin/angket/${form.id}/pratinjau`}
            target="_blank"
            onClick={(e) => {
              if (dirty) {
                e.preventDefault();
                setMsg({ type: 'error', text: 'Simpan perubahan dulu agar pratinjau menampilkan versi terbaru.' });
              }
            }}
          >
            <i className="bi bi-eye" /><span className="d-none d-sm-inline ms-1">Pratinjau</span>
          </Link>
          <Link className="btn btn-sm btn-outline-secondary" href={`/admin/angket/${form.id}/responden`}>
            <i className="bi bi-people" /><span className="d-none d-sm-inline ms-1">Responden</span>
          </Link>
          <button type="button" className="btn btn-sm btn-primary" onClick={save} disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check2 me-1" />}
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
        <ul className="nav nav-underline justify-content-center">
          <li className="nav-item">
            <button type="button" className={`nav-link ${tab === 'pertanyaan' ? 'active' : ''}`} onClick={() => setTab('pertanyaan')}>Pertanyaan</button>
          </li>
          <li className="nav-item">
            <button type="button" className={`nav-link ${tab === 'akses' ? 'active' : ''}`} onClick={() => setTab('akses')}>Akses &amp; pengaturan</button>
          </li>
        </ul>
      </div>

      {tab === 'pertanyaan' && (
        <div className="design-bar px-3 py-2 d-flex flex-wrap align-items-center gap-2">
          <span className="small fw-semibold text-secondary">Tampilan editor:</span>
          <div className="btn-group btn-group-sm" role="group" aria-label="Tampilan editor">
            {VIEWS.map((v) => (
              <button type="button" key={v.v} className={`btn btn-outline-primary ${view === v.v ? 'active' : ''}`} onClick={() => setView(v.v)}>
                <i className={`bi ${v.icon} me-1`} />{v.label}
              </button>
            ))}
          </div>
          <span className="small text-secondary d-none d-md-inline">
            Bawaan diatur di <Link href="/admin/pengaturan">Pengaturan</Link>.
          </span>
          {responseCount > 0 && (
            <span className="small text-secondary ms-md-auto"><i className="bi bi-info-circle me-1" />{responseCount} jawaban sudah masuk</span>
          )}
        </div>
      )}

      <div className="px-3 px-lg-4 py-4">
        {tab === 'akses' ? (
          <AccessPanel formId={form.id} meta={meta} setMeta={setMeta} baseUrl={baseUrl} defaultFillDesign={defaultFillDesign} />
        ) : view === 'kartu' ? (
          <CardsView meta={meta} setMeta={setMeta} qs={qs} ops={ops} active={active} setActive={setActive} />
        ) : (
          <PanelView meta={meta} setMeta={setMeta} qs={qs} ops={ops} sel={sel} setSel={setSel} brand={brand} design={pvDesign} setDesign={setPvDesign} />
        )}
      </div>

      <Toast msg={msg} onClose={() => setMsg(null)} />
    </div>
  );
}
