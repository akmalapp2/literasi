import type { Metadata } from 'next';
import Link from 'next/link';
import { createForm, deleteForm } from '@/actions/forms';
import ConfirmButton from '@/components/ConfirmButton';
import { requireAdmin } from '@/lib/auth';
import { ROLE_SHORT, formatDay } from '@/lib/text';
import type { FormRow } from '@/lib/types';

export const metadata: Metadata = { title: 'Angket' };

const STATUS: Record<string, string> = { draf: 'Draf', terbit: 'Terbit', ditutup: 'Ditutup' };

export default async function Dashboard() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('forms').select('*').order('created_at', { ascending: false });
  const forms = (data ?? []) as FormRow[];

  const stats = await Promise.all(
    forms.map(async (f) => {
      const [q, r, t] = await Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('form_id', f.id),
        supabase.from('responses').select('id', { count: 'exact', head: true }).eq('form_id', f.id),
        f.access_mode === 'terbuka'
          ? Promise.resolve({ count: null as number | null })
          : supabase.from('respondents').select('id', { count: 'exact', head: true }).eq('active', true).in('role', f.targets),
      ]);
      return { q: q.count ?? 0, r: r.count ?? 0, t: t.count };
    }),
  );
  const openCount = forms.filter((f) => f.status === 'terbit').length;

  const actions = (f: FormRow) => (
    <div className="d-flex gap-1 flex-wrap justify-content-end">
      <Link className="btn btn-sm btn-outline-secondary" href={`/admin/angket/${f.id}`} title="Ubah" aria-label="Ubah"><i className="bi bi-pencil" /></Link>
      <Link className="btn btn-sm btn-outline-secondary" href={`/admin/angket/${f.id}/responden`} title="Link responden" aria-label="Link responden"><i className="bi bi-link-45deg" /></Link>
      <Link className="btn btn-sm btn-outline-secondary" href={`/hasil/${f.slug}`} title="Lihat hasil" aria-label="Lihat hasil"><i className="bi bi-bar-chart" /></Link>
      <form action={deleteForm}>
        <input type="hidden" name="id" value={f.id} />
        <ConfirmButton className="btn btn-sm btn-outline-danger" title="Hapus angket"
          message={`Hapus angket "${f.title}"? Semua pertanyaan, link responden, dan jawaban ikut terhapus dan tidak bisa dikembalikan.`}>
          <i className="bi bi-trash" />
        </ConfirmButton>
      </form>
    </div>
  );
  const progress = (i: number) => {
    const s = stats[i];
    if (s.t === null) return <span className="small">{s.r} jawaban</span>;
    const pct = s.t ? Math.round((s.r / s.t) * 100) : 0;
    return (
      <div style={{ minWidth: 120 }}>
        <div className="small mb-1">{s.r} / {s.t}</div>
        <div className="progress"><div className="progress-bar" style={{ width: `${Math.min(100, pct)}%` }} /></div>
      </div>
    );
  };

  return (
    <div className="p-3 p-lg-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h1 className="h3 page-title mb-0">Angket</h1>
          <p className="text-secondary mb-0">{forms.length} angket, {openCount} sedang terbit</p>
        </div>
        <form action={createForm}>
          <button className="btn btn-primary"><i className="bi bi-plus-lg me-1" />Buat angket</button>
        </form>
      </div>

      {forms.length === 0 ? (
        <div className="list-card text-center py-5">
          <i className="bi bi-ui-checks fs-1 text-primary" />
          <p className="mt-2 mb-3">Belum ada angket. Buat angket pertama untuk kepala sekolah, guru, dan siswa.</p>
          <form action={createForm}><button className="btn btn-primary">Buat angket</button></form>
        </div>
      ) : (
        <>
          {/* Tablet & laptop: tabel */}
          <div className="card border-0 shadow-sm d-none d-md-block">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr><th className="ps-3">Judul</th><th>Sasaran</th><th>Status</th><th>Terisi</th><th className="text-end pe-3">Aksi</th></tr>
                </thead>
                <tbody>
                  {forms.map((f, i) => (
                    <tr key={f.id}>
                      <td className="ps-3">
                        <Link href={`/admin/angket/${f.id}`} className="fw-semibold text-body text-decoration-none">{f.title}</Link>
                        <div className="small text-secondary">
                          {stats[i].q} pertanyaan{f.closes_at ? `, ditutup ${formatDay(f.closes_at)}` : ''}
                        </div>
                      </td>
                      <td>{f.targets.map((r) => <span key={r} className={`badge-soft role ${r} me-1`}>{ROLE_SHORT[r]}</span>)}</td>
                      <td><span className={`badge-soft st-${f.status}`}>{STATUS[f.status]}</span></td>
                      <td>{progress(i)}</td>
                      <td className="text-end pe-3">{actions(f)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* HP: kartu */}
          <div className="d-md-none d-flex flex-column gap-2">
            {forms.map((f, i) => (
              <div key={f.id} className="list-card">
                <div className="d-flex gap-2 align-items-start mb-2">
                  <Link href={`/admin/angket/${f.id}`} className="fw-semibold text-body text-decoration-none flex-grow-1">{f.title}</Link>
                  <span className={`badge-soft st-${f.status}`}>{STATUS[f.status]}</span>
                </div>
                <div className="mb-2">{f.targets.map((r) => <span key={r} className={`badge-soft role ${r} me-1`}>{ROLE_SHORT[r]}</span>)}</div>
                <div className="d-flex align-items-end gap-2">
                  <div className="flex-grow-1">{progress(i)}</div>
                  {actions(f)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
