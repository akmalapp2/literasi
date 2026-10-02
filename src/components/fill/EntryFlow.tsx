'use client';

import { useState, useTransition } from 'react';
import { identify } from '@/actions/public';
import Credit from '@/components/Credit';
import { needsId } from '@/lib/access';
import { ID_LABEL, ROLE_LABEL, idShort } from '@/lib/text';
import type { AccessMode, Brand, FillDesign, OpenId, Question, Role } from '@/lib/types';
import EntryHero from './EntryHero';
import FillApp from './FillApp';

const ROLE_ICON: Record<Role, string> = {
  kepsek: 'bi-award',
  guru: 'bi-person-video3',
  tendik: 'bi-briefcase',
  siswa: 'bi-mortarboard',
  ortu: 'bi-people',
  alumni: 'bi-person-badge',
  umum: 'bi-person',
};

type Props = {
  brand: Brand;
  form: { id: string; title: string; description: string; slug: string; showResultsLink: boolean; access_mode: AccessMode; open_id: OpenId };
  targets: Role[];
  questions: Question[];
  design: FillDesign;
  turnstileSiteKey?: string | null;
};

/** Mode Kode & Terbuka: pilih peran → (nomor induk) → mulai mengisi. */
export default function EntryFlow({ brand, form, targets, questions, design, turnstileSiteKey }: Props) {
  const [role, setRole] = useState<Role | null>(targets.length === 1 ? targets[0] : null);
  const [step, setStep] = useState<'peran' | 'identitas' | 'isi'>('peran');
  const [code, setCode] = useState('');
  const [ident, setIdent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (step === 'isi' && role) {
    return (
      <FillApp brand={brand} form={form} questions={questions} design={design} targets={targets}
        mode="terbuka" presetRole={role} turnstileSiteKey={turnstileSiteKey} />
    );
  }

  const next = () => {
    if (!role) return;
    setError(null);
    setStep(needsId(form, role) ? 'identitas' : 'isi');
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setError(null);
    start(async () => {
      const r = await identify({ slug: form.slug, role, code: form.access_mode === 'kode' ? code : null, identifier: ident });
      if (r?.error) setError(r.error);
    });
  };

  if (step === 'identitas' && role) {
    return (
      <div className="entry">
        <EntryHero brand={brand} title={form.title} step={1} small />
        <form className="entry-body" onSubmit={submit}>
          <div className="q-num mb-1">{ROLE_LABEL[role]}</div>
          <h2 className="h5 fw-bold mb-3">
            {form.access_mode === 'kode' ? 'Masukkan kode dan nomor induk' : `Masukkan ${idShort(role)} Anda`}
          </h2>
          <div className="bg-white border rounded-3 p-3">
            {form.access_mode === 'kode' && (
              <>
                <label className="form-label fw-semibold" htmlFor="code">Kode</label>
                <input id="code" className="form-control form-control-lg text-uppercase mb-3" autoComplete="off" required maxLength={30}
                  value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
              </>
            )}
            <label className="form-label fw-semibold" htmlFor="ident">{ID_LABEL[role]}</label>
            <input id="ident" className="form-control form-control-lg" inputMode="numeric" autoComplete="off" required maxLength={30}
              value={ident} onChange={(e) => setIdent(e.target.value)} autoFocus={form.access_mode !== 'kode'} />
            {error && <div className="alert alert-danger py-2 small mt-3 mb-0" role="alert">{error}</div>}
          </div>
          <p className="small text-secondary mt-3">
            {role === 'siswa' ? 'NIT tertera di kartu taruna. Belum terdaftar? Hubungi wali kelas.' : 'Belum terdaftar? Hubungi admin sekolah.'}
          </p>
          <Credit creator={brand.creator} />
          <div className="entry-bottom"><div className="inner">
            <button type="button" className="btn btn-light" onClick={() => { setStep('peran'); setError(null); }}>
              <i className="bi bi-arrow-left" /> Kembali
            </button>
            <button className="btn btn-primary ms-auto px-4" disabled={pending}>
              {pending && <span className="spinner-border spinner-border-sm me-2" />}Masuk
            </button>
          </div></div>
        </form>
      </div>
    );
  }

  return (
    <div className="entry">
      <EntryHero brand={brand} title={form.title} step={0} />
      <div className="entry-body">
        <div className="q-num mb-1">Sebelum mulai</div>
        <h2 className="h5 fw-bold mb-3">Anda mengisi sebagai…</h2>
        {targets.map((r) => (
          <button type="button" key={r} className={`tile ${role === r ? 'on' : ''}`} aria-pressed={role === r} onClick={() => setRole(r)}>
            <span className="ic"><i className={`bi ${ROLE_ICON[r]}`} /></span>
            <span>
              <span className="fw-semibold d-block">{ROLE_LABEL[r]}</span>
              <span className="small text-secondary">{needsId(form, r) ? `Masuk dengan ${idShort(r)}` : 'Tanpa identitas, anonim'}</span>
            </span>
            <i className="bi bi-check-circle-fill tick" />
          </button>
        ))}
        <p className="small text-secondary mt-3 mb-0"><i className="bi bi-shield-lock me-1" />Nama tidak ditampilkan di halaman hasil.</p>
        <Credit creator={brand.creator} />
        <div className="entry-bottom"><div className="inner">
          <button type="button" className="btn btn-primary btn-lg w-100" disabled={!role} onClick={next}>Lanjut</button>
        </div></div>
      </div>
    </div>
  );
}
