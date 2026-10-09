import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrandMark } from '@/components/Brand';
import ResultsCharts, { type QResult } from '@/components/results/ResultsCharts';
import TrendChart, { type TrendPoint } from '@/components/results/TrendChart';
import StatusCard from '@/components/StatusCard';
import { isAdminSession } from '@/lib/auth';
import { resultsVisible } from '@/lib/form-window';
import { fetchAll } from '@/lib/fetch-all';
import { PERIOD_WORD, periodKey, periodLabel, periodShort, rangeOfKey } from '@/lib/period';
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
  searchParams: Promise<{ peran?: string; kelas?: string; periode?: string }>;
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

  // ---------- Periode (untuk angket berulang) ----------
  const repeat = !!form.repeat_mode && form.repeat_mode !== 'sekali';
  const unit = form.repeat_mode === 'harian' ? 'Hari' : 'Minggu';
  let periods: { key: string; n: number }[] = [];
  let trend: TrendPoint[] = [];
  let allResp: { submitted_at: string; role: Role | null }[] = [];
  if (repeat) {
    allResp = await fetchAll<{ submitted_at: string; role: Role | null }>((a, b) =>
      db.from('responses').select('submitted_at, role').eq('form_id', form.id).order('submitted_at').range(a, b),
    );
    const byKey = new Map<string, Partial<Record<Role, number>>>();
    for (const x of allResp) {
      const k = periodKey(form.repeat_mode, x.submitted_at);
      const c = byKey.get(k) ?? {};
      if (x.role) c[x.role] = (c[x.role] ?? 0) + 1;
      byKey.set(k, c);
    }
    const keys = [...byKey.keys()].sort();
    periods = [...keys].reverse().map((k) => ({ key: k, n: Object.values(byKey.get(k) ?? {}).reduce((a, v) => a + (v ?? 0), 0) }));
    trend = keys.slice(-12).map((k) => ({ key: k, label: periodShort(k), long: periodLabel(k), counts: byKey.get(k) ?? {} }));
  }
  const currentKey = repeat ? periodKey(form.repeat_mode) : null;
  const chosenKey = repeat && sp.periode && rangeOfKey(sp.periode) && sp.periode.startsWith(form.repeat_mode === 'harian' ? 'D' : 'W') ? sp.periode : null;
  const range = chosenKey ? rangeOfKey(chosenKey) : null;
  /** Periode yang dipakai untuk angka partisipasi: pilihan pengguna, atau periode sekarang. */
  const partKey = chosenKey ?? currentKey;

  const { data: res } = await db.rpc('form_results', {
    p_form_id: form.id, p_role: peran, p_class: kelas, p_from: range?.start ?? null, p_to: range?.end ?? null,
  });
  const results = (res ?? { total: 0, questions: [] }) as Results;

  const participation = await Promise.all(
    form.targets.map(async (r) => {
      let done: number;
      if (repeat) {
        done = allResp.filter((x) => x.role === r && periodKey(form.repeat_mode, x.submitted_at) === partKey).length;
      } else {
        done = (await db.from('responses').select('id', { count: 'exact', head: true }).eq('form_id', form.id).eq('role', r)).count ?? 0;
      }
      const total =
        r === 'umum'
          ? null
          : (await db.from('respondents').select('id', { count: 'exact', head: true }).eq('role', r).eq('active', true)).count;
      return { role: r, done, total };
    }),
  );
  const allDone = participation.reduce((a, p) => a + p.done, 0);
  const allTotal = participation.every((p) => p.total !== null) ? participation.reduce((a, p) => a + (p.total ?? 0), 0) : null;

  let classes: string[] = [];
  const classRoles = form.targets.filter((r) => r === 'siswa' || r === 'ortu');
  if (classRoles.length) {
    const cls = await fetchAll<{ class_name: string }>((a, b) =>
      db.from('respondents').select('class_name').in('role', classRoles).not('class_name', 'is', null).order('id').range(a, b),
    );
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
              <div className="text-secondary">
                {allTotal !== null ? `dari ${allTotal} responden` : 'responden'}
                {repeat ? (partKey === currentKey ? ` ${PERIOD_WORD[form.repeat_mode]}` : '') : ''}
              </div>
              {repeat && partKey && <div className="small text-secondary">{periodLabel(partKey)}</div>}
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
            {repeat && periods.length > 0 && (
              <select name="periode" className="form-select" style={{ maxWidth: 260 }} defaultValue={chosenKey ?? ''} aria-label={`Saring ${unit.toLowerCase()}`}>
                <option value="">Semua {unit.toLowerCase()} (grafik gabungan)</option>
                {periods.map((p) => (
                  <option key={p.key} value={p.key}>{periodLabel(p.key)}{p.key === currentKey ? ' (sekarang)' : ''} · {p.n} jawaban</option>
                ))}
              </select>
            )}
            <button className="btn btn-outline-primary">Terapkan</button>
            {(peran || kelas || chosenKey) && <Link href={`/hasil/${form.slug}`} className="btn btn-link">Hapus saringan</Link>}
            <span className="small text-secondary ms-md-auto">Nama responden tidak pernah ditampilkan.</span>
          </form>
        </div></div>

        {repeat && trend.length > 0 && (
          <div className="card border-0 shadow-sm mb-3"><div className="card-body p-3 p-md-4">
            <h2 className="h6 fw-bold mb-1">Tren pengisian per {unit.toLowerCase()}</h2>
            <div className="small text-secondary mb-3">
              Jumlah yang mengisi tiap {unit.toLowerCase()}, dipisah per peran{trend.length === 12 ? ` (12 ${unit.toLowerCase()} terakhir)` : ''}.
            </div>
            <TrendChart points={trend} roles={form.targets} unit={unit} />
          </div></div>
        )}

        {(peran || kelas || chosenKey) && (
          <p className="small text-secondary">
            Menampilkan {results.total} jawaban{peran ? ` dari ${ROLE_LABEL[peran]}` : ''}{kelas ? `, kelas ${kelas}` : ''}
            {chosenKey ? `, ${periodLabel(chosenKey)}` : ''}.
          </p>
        )}

        <ResultsCharts questions={results.questions} hideText={form.hide_text_public && !admin} />

        <p className="small text-secondary mt-4">
          Status: {form.status === 'ditutup' ? 'ditutup' : 'sedang berjalan'}
          {form.closes_at ? `, batas pengisian ${formatDate(form.closes_at)} WITA` : ''}.
        </p>
        <Credit creator={brand.creator} />
      </main>
    </div>
  );
}
