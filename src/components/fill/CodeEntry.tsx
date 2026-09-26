'use client';

import { useActionState } from 'react';
import { enterWithCode } from '@/actions/public';
import { BrandMark } from '@/components/Brand';
import type { Brand } from '@/lib/types';

export default function CodeEntry({ brand, slug, title }: { brand: Brand; slug: string; title: string }) {
  const [state, action, pending] = useActionState(enterWithCode, null);
  return (
    <div className="fokus">
      <div className="fokus-top">
        <BrandMark brand={brand} size={38} />
        <svg className="wave" viewBox="0 0 1200 26" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 14 C150 0 300 0 450 12 S750 26 900 12 S1100 2 1200 10 V26 H0Z" fill="#EAF3FD" />
        </svg>
      </div>
      <div className="fokus-body">
        <div className="q-num">{title}</div>
        <h1 className="q-big">Masukkan kode angket dan nomor induk</h1>
        <form action={action} className="bg-white border rounded-3 p-3 p-md-4">
          <input type="hidden" name="slug" value={slug} />
          <label className="form-label fw-semibold" htmlFor="code">Kode angket</label>
          <input id="code" name="code" className="form-control form-control-lg text-uppercase mb-3" autoComplete="off" required maxLength={30} />
          <label className="form-label fw-semibold" htmlFor="identifier">Nomor induk (NISN, NIP, NUPTK, atau nomor yang didaftarkan sekolah)</label>
          <input id="identifier" name="identifier" className="form-control form-control-lg mb-3" autoComplete="off" required maxLength={30} />
          {state?.error && <div className="alert alert-danger py-2" role="alert">{state.error}</div>}
          <button className="btn btn-primary btn-lg w-100" disabled={pending}>
            {pending && <span className="spinner-border spinner-border-sm me-2" />}Lanjut
          </button>
        </form>
        <p className="small text-secondary mt-3">Kode angket dibagikan oleh wali kelas atau admin sekolah.</p>
      </div>
    </div>
  );
}
