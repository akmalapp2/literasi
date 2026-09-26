'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Brand } from '@/lib/types';
import Credit from '@/components/Credit';

export default function LoginForm({ brand, next, notAdmin }: { brand: Brand; next: string; notAdmin: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <div className="text-center mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo mb-3" src={brand.logo} width={92} height={86} alt={`Logo ${brand.schoolName}`} />
        <h1 className="h4 page-title mb-1">{brand.appName}</h1>
        <p className="text-secondary mb-0">{brand.schoolName}</p>
      </div>
      <form className="card border-0 shadow-sm" onSubmit={submit}>
        <div className="card-body p-4">
          <label className="form-label fw-semibold" htmlFor="em">Email admin</label>
          <input id="em" type="email" className="form-control mb-3" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="form-label fw-semibold" htmlFor="pw">Kata sandi</label>
          <input id="pw" type="password" className="form-control mb-3" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
          <button className="btn btn-primary w-100" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}Masuk
          </button>
        </div>
      </form>
      <p className="small text-secondary text-center mt-3">
        Halaman ini khusus admin. Responden mengisi angket lewat link, kode, atau QR yang dibagikan sekolah.
      </p>
      <Credit />
    </div>
  );
}
