'use client';

import { TYPE_ICON, TYPE_LABEL, isChoice } from '@/lib/text';
import type { FormMeta, Question } from '@/lib/types';
import { OptionsEditor, RangeFields, RoleChips, TextPlaceholder, TypeSelect, type QOps } from './shared';

type Props = {
  meta: FormMeta;
  setMeta: (p: Partial<FormMeta>) => void;
  qs: Question[];
  ops: QOps;
  active: number;
  setActive: (i: number) => void;
};

/** Tampilan editor 1: kartu berurutan (mirip Google Form). */
export default function CardsView({ meta, setMeta, qs, ops, active, setActive }: Props) {
  const addAfter = (i: number) => {
    const n = ops.add(i);
    setActive(n);
    requestAnimationFrame(() => document.getElementById(`card-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  return (
    <div className="editor-wrap mx-auto d-flex flex-column gap-3">
      <div className="q-card head p-3 p-md-4">
        <input
          className="form-control form-control-lg q-input fw-bold mb-2"
          value={meta.title}
          placeholder="Judul angket"
          aria-label="Judul angket"
          onChange={(e) => setMeta({ title: e.target.value })}
        />
        <textarea
          className="form-control q-input mb-3"
          rows={2}
          value={meta.description}
          placeholder="Keterangan pembuka (opsional)"
          aria-label="Keterangan"
          onChange={(e) => setMeta({ description: e.target.value })}
        />
        <div className="small fw-semibold mb-1">Sasaran angket</div>
        <div className="d-flex flex-wrap gap-2">
          <RoleChips value={meta.targets} onChange={(v) => setMeta({ targets: v })} />
        </div>
      </div>

      {qs.map((q, i) => (
        <div
          key={q.id}
          id={`card-${i}`}
          className={`q-card p-3 p-md-4 ${i === active ? 'active' : ''}`}
          onFocusCapture={() => setActive(i)}
          onClick={() => setActive(i)}
        >
          <div className="row g-2 mb-3">
            <div className="col-md-7">
              <textarea
                className="form-control q-input fw-semibold"
                rows={2}
                value={q.title}
                aria-label={`Pertanyaan ${i + 1}`}
                onChange={(e) => ops.update(i, { title: e.target.value })}
              />
            </div>
            <div className="col-md-5">
              <TypeSelect value={q.type} onChange={(t) => ops.setType(i, t)} />
            </div>
          </div>
          <div className="mb-3">
            {isChoice(q.type) ? (
              <OptionsEditor q={q} onChange={(o) => ops.update(i, { options: o })} onSettings={(st) => ops.update(i, { settings: st })} />
            ) : q.type === 'range' ? (
              <RangeFields q={q} onSettings={(st) => ops.update(i, { settings: st })} />
            ) : (
              <TextPlaceholder q={q} />
            )}
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <span className="small text-secondary">Tampil untuk:</span>
            <RoleChips value={q.roles} onChange={(v) => ops.update(i, { roles: v })} />
          </div>
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-1 border-top pt-3">
            <span className="small text-secondary me-auto">
              <i className={`bi ${TYPE_ICON[q.type]} me-1`} />
              {i + 1}. {TYPE_LABEL[q.type]}
            </span>
            <button type="button" className="btn btn-sm btn-light" title="Naikkan" aria-label="Naikkan" disabled={i === 0} onClick={() => { ops.move(i, -1); setActive(i - 1); }}>
              <i className="bi bi-arrow-up" />
            </button>
            <button type="button" className="btn btn-sm btn-light" title="Turunkan" aria-label="Turunkan" disabled={i === qs.length - 1} onClick={() => { ops.move(i, 1); setActive(i + 1); }}>
              <i className="bi bi-arrow-down" />
            </button>
            <button type="button" className="btn btn-sm btn-light" title="Duplikat" aria-label="Duplikat" onClick={() => ops.duplicate(i)}>
              <i className="bi bi-copy" />
            </button>
            <button type="button" className="btn btn-sm btn-light text-danger" title="Hapus" aria-label="Hapus pertanyaan" onClick={() => ops.remove(i)}>
              <i className="bi bi-trash" />
            </button>
            <div className="vr mx-2" />
            <div className="form-check form-switch mb-0">
              <input className="form-check-input" type="checkbox" id={`req-${q.id}`} checked={q.required} onChange={(e) => ops.update(i, { required: e.target.checked })} />
              <label className="form-check-label small" htmlFor={`req-${q.id}`}>Wajib</label>
            </div>
          </div>
          {i === active && (
            <button type="button" className="btn btn-sm btn-outline-primary mt-3" onClick={(e) => { e.stopPropagation(); addAfter(i); }}>
              <i className="bi bi-plus-lg me-1" />Tambah pertanyaan di bawah ini
            </button>
          )}
        </div>
      ))}

      <button type="button" className="btn btn-outline-primary align-self-center" onClick={() => addAfter(qs.length - 1)}>
        <i className="bi bi-plus-lg me-1" />Tambah pertanyaan
      </button>
    </div>
  );
}
