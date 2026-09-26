'use client';

import { KEYS, ROLE_LABEL, TYPE_ICON, TYPE_LABEL } from '@/lib/text';
import { QTYPES, ROLES, type QType, type Question, type Role } from '@/lib/types';

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

export function RoleChips({ value, onChange }: { value: Role[]; onChange: (v: Role[]) => void }) {
  return (
    <>
      {ROLES.map((r) => {
        const on = value.includes(r);
        return (
          <button
            type="button"
            key={r}
            className={`chip-role ${on ? 'on' : ''}`}
            aria-pressed={on}
            onClick={() => {
              if (on) {
                if (value.length > 1) onChange(value.filter((x) => x !== r));
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

export function RoleDots({ roles }: { roles: Role[] }) {
  return (
    <span className="ol-dots" title={roles.map((r) => ROLE_LABEL[r]).join(', ')}>
      {ROLES.map((r) => (
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

export function OptionsEditor({ q, onChange, compact = false }: { q: Question; onChange: (opts: string[]) => void; compact?: boolean }) {
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
      <button type="button" className="btn btn-sm btn-link text-decoration-none ps-0" onClick={() => onChange([...q.options, `Opsi ${q.options.length + 1}`])}>
        <i className="bi bi-plus" /> Tambah opsi
      </button>
      <div className="form-text mt-0">Tekan Enter di kotak opsi untuk menambah opsi di bawahnya.</div>
    </div>
  );
}

export function TextPlaceholder({ q }: { q: Question }) {
  return q.type === 'short' ? (
    <input className="form-control q-input w-75" disabled placeholder="Jawaban singkat responden" />
  ) : (
    <textarea className="form-control q-input" rows={2} disabled placeholder="Jawaban panjang responden" />
  );
}
