'use client';

import { endLabel, startLabel } from '@/lib/answers';
import { KEYS, ROLE_LABEL, TYPE_ICON, TYPE_LABEL } from '@/lib/text';
import { QTYPES, ROLES, type QSettings, type QType, type Question, type Role } from '@/lib/types';

export type QOps = {
  update: (i: number, patch: Partial<Question>) => void;
  setType: (i: number, t: QType) => void;
  add: (after: number) => number;
  duplicate: (i: number) => void;
  remove: (i: number) => void;
  move: (i: number, dir: -1 | 1) => void;
};

/** UUID v4, dengan cadangan untuk browser lama / non-HTTPS. */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Pilih peran. `choices` membatasi pilihan (mis. hanya sasaran angket). */
export function RoleChips({ value, onChange, choices = ROLES }: { value: Role[]; onChange: (v: Role[]) => void; choices?: Role[] }) {
  const shown = value.filter((r) => choices.includes(r));
  return (
    <>
      {choices.map((r) => {
        const on = value.includes(r);
        return (
          <button
            type="button"
            key={r}
            className={`chip-role ${on ? 'on' : ''}`}
            aria-pressed={on}
            onClick={() => {
              if (on) {
                if (shown.length > 1) onChange(value.filter((x) => x !== r));
              } else onChange(ROLES.filter((x) => x === r || value.includes(x)));
            }}
          >
            {ROLE_LABEL[r]}
          </button>
        );
      })}
    </>
  );
}

export function RoleDots({ roles, choices = ROLES }: { roles: Role[]; choices?: Role[] }) {
  return (
    <span className="ol-dots" title={roles.filter((r) => choices.includes(r)).map((r) => ROLE_LABEL[r]).join(', ')}>
      {choices.map((r) => (
        <span key={r} className={roles.includes(r) ? r : ''} />
      ))}
    </span>
  );
}

export function TypeSelect({ value, onChange, id }: { value: QType; onChange: (t: QType) => void; id?: string }) {
  return (
    <select id={id} className="form-select" value={value} aria-label="Jenis pertanyaan" onChange={(e) => onChange(e.target.value as QType)}>
      {QTYPES.map((t) => (
        <option key={t} value={t}>{TYPE_LABEL[t]}</option>
      ))}
    </select>
  );
}

export function TypeChips({ value, onChange }: { value: QType; onChange: (t: QType) => void }) {
  return (
    <div className="d-flex flex-wrap gap-2">
      {QTYPES.map((t) => (
        <button type="button" key={t} className={`chip-role ${t === value ? 'on' : ''}`} aria-pressed={t === value} onClick={() => onChange(t)}>
          <i className={`bi ${TYPE_ICON[t]} me-1`} />
          {TYPE_LABEL[t]}
        </button>
      ))}
    </div>
  );
}

type OptProps = {
  q: Question;
  onChange: (opts: string[]) => void;
  onSettings: (s: QSettings) => void;
  compact?: boolean;
};

export function OptionsEditor({ q, onChange, onSettings, compact = false }: OptProps) {
  const st = q.settings ?? {};
  const marker = (k: number) =>
    compact ? (
      <span className="ol-no">{q.type === 'dropdown' ? k + 1 : KEYS[k]}</span>
    ) : (
      <span className="text-secondary text-center" style={{ width: '1.4rem' }}>
        {q.type === 'radio' ? <i className="bi bi-circle" /> : q.type === 'checkbox' ? <i className="bi bi-square" /> : `${k + 1}.`}
      </span>
    );

  return (
    <div data-opts>
      {q.options.map((o, k) => (
        <div key={k} className="d-flex align-items-center gap-2 mb-2">
          {marker(k)}
          <input
            className={`form-control form-control-sm ${compact ? '' : 'q-input'}`}
            value={o}
            aria-label={`Opsi ${k + 1}`}
            onChange={(e) => {
              const n = [...q.options];
              n[k] = e.target.value;
              onChange(n);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              const box = e.currentTarget.closest('[data-opts]');
              const n = [...q.options];
              n.splice(k + 1, 0, '');
              onChange(n);
              requestAnimationFrame(() => (box?.querySelectorAll('input')[k + 1] as HTMLInputElement | undefined)?.focus());
            }}
          />
          <button
            type="button"
            className="btn btn-sm btn-link text-secondary"
            title="Hapus opsi"
            aria-label={`Hapus opsi ${k + 1}`}
            onClick={() => onChange(q.options.filter((_, j) => j !== k))}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      ))}
      {st.allow_other && (
        <div className="d-flex align-items-center gap-2 mb-2">
          {marker(q.options.length)}
          <input
            className={`form-control form-control-sm ${compact ? '' : 'q-input'}`}
            value={st.other_label ?? ''}
            placeholder="Lainnya, tuliskan"
            aria-label="Label opsi lainnya"
            onChange={(e) => onSettings({ ...st, other_label: e.target.value })}
          />
          <span className="badge text-bg-light border text-nowrap" title="Responden bisa mengetik jawaban sendiri">
            <i className="bi bi-input-cursor-text me-1" />isian
          </span>
          <button type="button" className="btn btn-sm btn-link text-secondary" title="Hapus opsi Lainnya" aria-label="Hapus opsi Lainnya"
            onClick={() => onSettings({ ...st, allow_other: false })}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
      )}
      <div className="d-flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm btn-link text-decoration-none ps-0" onClick={() => onChange([...q.options, `Opsi ${q.options.length + 1}`])}>
          <i className="bi bi-plus" /> Tambah opsi
        </button>
        {!st.allow_other && (
          <button type="button" className="btn btn-sm btn-link text-decoration-none ps-0"
            onClick={() => onSettings({ ...st, allow_other: true, other_label: st.other_label || 'Lainnya, tuliskan' })}>
            <i className="bi bi-input-cursor-text" /> Tambah opsi &quot;Lainnya&quot; (bisa diketik)
          </button>
        )}
      </div>
      <div className="form-text mt-0">Tekan Enter di kotak opsi untuk menambah opsi di bawahnya. Opsi &quot;Lainnya&quot; selalu tampil paling akhir.</div>
    </div>
  );
}

export function RangeFields({ q, onSettings }: { q: Question; onSettings: (s: QSettings) => void }) {
  const st = q.settings ?? {};
  const num = (v: string) => (v.trim() === '' ? null : Math.trunc(Number(v)));
  return (
    <div className="row g-2">
      <div className="col-6">
        <label className="form-label small fw-semibold mb-1" htmlFor={`rs-${q.id}`}>Label awal</label>
        <input id={`rs-${q.id}`} className="form-control form-control-sm" placeholder="Mulai halaman" value={st.start_label ?? ''}
          onChange={(e) => onSettings({ ...st, start_label: e.target.value })} />
      </div>
      <div className="col-6">
        <label className="form-label small fw-semibold mb-1" htmlFor={`re-${q.id}`}>Label akhir</label>
        <input id={`re-${q.id}`} className="form-control form-control-sm" placeholder="sampai halaman" value={st.end_label ?? ''}
          onChange={(e) => onSettings({ ...st, end_label: e.target.value })} />
      </div>
      <div className="col-6">
        <label className="form-label small fw-semibold mb-1" htmlFor={`rmin-${q.id}`}>Angka terkecil (opsional)</label>
        <input id={`rmin-${q.id}`} type="number" className="form-control form-control-sm" value={st.min ?? ''}
          onChange={(e) => onSettings({ ...st, min: num(e.target.value) })} />
      </div>
      <div className="col-6">
        <label className="form-label small fw-semibold mb-1" htmlFor={`rmax-${q.id}`}>Angka terbesar (opsional)</label>
        <input id={`rmax-${q.id}`} type="number" className="form-control form-control-sm" value={st.max ?? ''}
          onChange={(e) => onSettings({ ...st, max: num(e.target.value) })} />
      </div>
      <div className="col-12 small text-secondary">
        Tampil ke responden: {startLabel(st)} <span className="border rounded px-2">2</span> {endLabel(st)} <span className="border rounded px-2">10</span>
      </div>
    </div>
  );
}

export function TextPlaceholder({ q }: { q: Question }) {
  if (q.type === 'date') return <input type="date" className="form-control q-input w-auto" disabled aria-label="Contoh isian tanggal" />;
  if (q.type === 'short') return <input className="form-control q-input w-75" disabled placeholder="Jawaban singkat responden" />;
  return <textarea className="form-control q-input" rows={2} disabled placeholder="Jawaban panjang responden" />;
}

