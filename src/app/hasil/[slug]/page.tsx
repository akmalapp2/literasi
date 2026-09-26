import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrandMark } from '@/components/Brand';
import ResultsCharts, { type QResult } from '@/components/results/ResultsCharts';
import StatusCard from '@/components/StatusCard';
import { isAdminSession } from '@/lib/auth';
import { resultsVisible } from '@/lib/form-window';
import { getSettings, toBrand } from '@/lib/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import { ROLE_LABEL, formatDate } from '@/lib/text';
import { ROLES, type FormRow, type Role } from '@/lib/types';
import Credit from '@/components/Credit';

export const metadata: Metadata = { title: 'Hasil angket' };

type Results = { total: number; questions: QResult[] };

export default async function HasilPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ peran?: string; kelas?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const brand = toBrand(await getSettings());
  const db = createAdminClient();

  const { data } = await db.from('forms').select('*').eq('slug', slug).maybeSingle();
  if (!data) notFound();
  const form = data as FormRow;

  const admin = await isAdminSession();
  const visible = resultsVisible(form);
  if (!visible && !admin) {
    return <StatusCard brand={brand} icon="bi-lock" title="Hasil belum dipublikasikan" text="Hasil angket ini belum dibuka untuk umum. Silakan kembali nanti." />;
  }

  const peran = ROLES.includes(sp.peran as Role) ? (sp.peran as Role) : null;
  const kelas = sp.kelas?.trim() || null;

  const { data: res } = await db.rpc('form_results', { p_form_id: form.id, p_role: peran, p_class: kelas });
  const results = (res ?? { total: 0, questions: [] }) as Results;

  const participation = await Promise.all(
    form.targets.map(async (r) => {
      const done = await db.from('responses').select('id', { count: 'exact', head: true }).eq('form_id', form.id).eq('role', r);
      const total =
        r === 'umum'
          ? null
          : (await db.from('respondents').select('id', { count: 'exact', head: true }).eq('role', r).eq('active', true)).count;
      return { role: r, done: done.count ?? 0, total };
    }),
  );
  const allDone = participation.reduce((a, p) => a + p.done, 0);
  const allTotal = participation.every((p) => p.total !== null) ? participation.reduce((a, p) => a + (p.total ?? 0), 0) : null;

  let classes: string[] = [];
  const classRoles = form.targets.filter((r) => r === 'siswa' || r === 'ortu');
  if (classRoles.length) {
    const { data: cls } = await db.from('respondents').select('class_name').in('role', classRoles).not('class_name', 'is', null).range(0, 4999);
    classes = Array.from(new Set<string>((cls ?? []).map((c) => c.class_name as string))).sort((a, b) => a.localeCompare(b, 'id'));
  }

  return (
    <div>
      <header className="hasil-head">
        <div className="container py-3 d-flex align-items-center gap-3" style={{ maxWidth: 1000 }}>
          <Link href="/" className="text-reset text-decoration-none"><BrandMark brand={brand} size={50} /></Link>
        </div>
      </header>
      <main className="container py-4" style={{ maxWidth: 1000 }}>
        {!visible && (
          <div className="alert alert-warning small"><i className="bi bi-eye-slash me-1" />Hasil ini belum publik. Hanya admin yang bisa melihatnya.</div>
        )}
        <div className="small text-secondary mb-1">Hasil angket, diperbarui otomatis</div>
        <h1 className="h3 page-title mb-3">{form.title}</h1>

        <div className="card border-0 shadow-sm mb-3"><div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap gap-4 align-items-center">
            <div>
              <div className="stat-num">{allDone}</div>
              <div className="text-secondary">{allTotal !== null ? `dari ${allTotal} responden` : 'responden'}</div>
            </div>
            <div className="flex-grow-1" style={{ minWidth: 240 }}>
              {participation.map((p) => (
                <div key={p.role} className="mb-2">
                  <div className="d-flex justify-content-between small mb-1">
                    <span>{ROLE_LABEL[p.role]}</span>
                    <strong>{p.done}{p.total !== null ? ` / ${p.total}` : ''}</strong>
                  </div>
                  {p.total ? <div className="progress"><div className="progress-bar" style={{ width: `${Math.min(100, Math.round((p.done / p.total) * 100))}%` }} /></div> : null}
                </div>
              ))}
            </div>
          </div>
          <form className="d-flex flex-wrap gap-2 mt-3 pt-3 border-top align-items-center" method="get">
            <select name="peran" className="form-select" style={{ maxWidth: 200 }} defaultValue={peran ?? ''} aria-label="Saring peran">
              <option value="">Semua peran</option>
              {form.targets.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            {classes.length > 0 && (
              <select name="kelas" className="form-select" style={{ maxWidth: 200 }} defaultValue={kelas ?? ''} aria-label="Saring kelas">
                <option value="">Semua kelas</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <button className="btn btn-outline-primary">Terapkan</button>
            {(peran || kelas) && <Link href={`/hasil/${form.slug}`} className="btn btn-link">Hapus saringan</Link>}
            <span className="small text-secondary ms-md-auto">Nama responden tidak pernah ditampilkan.</span>
          </form>
        </div></div>

        {(peran || kelas) && (
          <p className="small text-secondary">Menampilkan {results.total} jawaban{peran ? ` dari ${ROLE_LABEL[peran]}` : ''}{kelas ? `, kelas ${kelas}` : ''}.</p>
        )}

        <ResultsCharts questions={results.questions} hideText={form.hide_text_public && !admin} />

        <p className="small text-secondary mt-4">
          Status: {form.status === 'ditutup' ? 'ditutup' : 'sedang berjalan'}
          {form.closes_at ? `, batas pengisian ${formatDate(form.closes_at)} WITA` : ''}.
        </p>
        <Credit />
      </main>
    </div>
  );
}
