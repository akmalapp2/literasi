'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Credit from '@/components/Credit';
import { createClient } from '@/lib/supabase/client';
import type { Brand } from '@/lib/types';

/** Halaman login admin — Desain 3 "Laut": latar biru penuh, gelombang, kartu putih di tengah. */
export default function LoginForm({ brand, next, notAdmin }: { brand: Brand; next: string; notAdmin: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState<string | null>(notAdmin ? 'Akun ini bukan admin. Hubungi pengelola aplikasi.' : null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message.includes('Invalid login') ? 'Email atau kata sandi salah.' : 'Gagal masuk: ' + error.message);
      setBusy(false);
      return;
    }
    router.replace(next);
    router.refresh();
  };

  const capsCheck = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState('CapsLock'));

  return (
    <div className="login-laut">
      <svg className="waves" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 70 C200 30 400 30 600 70 S1000 110 1200 70 V160 H0Z" fill="#1D4696" opacity=".55" />
        <path d="M0 105 C220 75 420 75 620 105 S1000 135 1200 105 V160 H0Z" fill="#7FBAF5" opacity=".35" />
      </svg>

      <div className="head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo" src={brand.logo} width={96} height={89} alt={`Logo ${brand.schoolName}`} />
        <h1>{brand.appName}</h1>
        <div className="sch">{brand.schoolName}</div>
      </div>

      <form className="card-l" onSubmit={submit}>
        <h2 className="h4 fw-bold mb-1">Masuk admin</h2>
        <p className="text-secondary mb-4">Masukkan email dan kata sandi Anda.</p>

        <label className="form-label fw-semibold" htmlFor="em">Email</label>
        <input id="em" type="email" className="form-control form-control-lg mb-3" autoComplete="username" required
          placeholder="nama@sekolah.sch.id" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label className="form-label fw-semibold" htmlFor="pw">Kata sandi</label>
        <div className="pw-wrap">
          <input id="pw" type={show ? 'text' : 'password'} className="form-control form-control-lg" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} onKeyUp={capsCheck} onKeyDown={capsCheck} onBlur={() => setCaps(false)} />
          <button type="button" className="pw-eye" aria-pressed={show} aria-controls="pw"
            aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} title={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            onClick={() => setShow((v) => !v)}>
            <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`} />
          </button>
        </div>
        {caps && <div className="caps"><i className="bi bi-capslock-fill me-1" />Caps Lock menyala</div>}

        {error && <div className="alert alert-danger py-2 small mt-3 mb-0" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg w-100 mt-4" disabled={busy}>
          {busy && <span className="spinner-border spinner-border-sm me-2" />}Masuk
        </button>
      </form>

      <Credit creator={brand.creator} light className="text-center" />
    </div>
  );
}
