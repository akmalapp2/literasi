import type { Metadata } from 'next';
import Link from 'next/link';
import { deleteRespondent, saveRespondent } from '@/actions/respondents';
import ImportExcel from '@/components/admin/ImportExcel';
import ConfirmButton from '@/components/ConfirmButton';
import { requireAdmin } from '@/lib/auth';
import { ROLE_LABEL, ROLE_SHORT } from '@/lib/text';
import { ROLES, type Respondent, type Role } from '@/lib/types';
import { fetchAll } from '@/lib/fetch-all';

export const metadata: Metadata = { title: 'Responden' };

type SP = { q?: string; peran?: string; kelas?: string; edit?: string; baru?: string; ok?: string; e?: string };

export default async function RespondentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const build = (a: number, b: number) => {
    let query = supabase.from('respondents').select('*').order('role').order('class_name').order('name').order('id').range(a, b);
    if (sp.peran && ROLES.includes(sp.peran as Role)) query = query.eq('role', sp.peran);
    if (sp.kelas) query = query.eq('class_name', sp.kelas);
    if (sp.q) {
      const term = sp.q.replace(/[%,()]/g, ' ').trim();
      if (term) query = query.or(`name.ilike.%${term}%,identifier.ilike.%${term}%`);
    }
    return query;
  };
  const [data, cls, counts] = await Promise.all([
    fetchAll<Respondent>(build),
    fetchAll<{ class_name: string }>((a, b) => supabase.from('respondents').select('class_name').in('role', ['siswa', 'ortu']).not('class_name', 'is', null).order('id').range(a, b)),
    Promise.all(ROLES.map((r) => supabase.from('respondents').select('id', { count: 'exact', head: true }).eq('role', r))),
  ]);
  const people = (data ?? []) as Respondent[];
  const classes = Array.from(new Set<string>((cls ?? []).map((c) => c.class_name as string))).sort((a, b) => a.localeCompare(b, 'id'));

  let editing: Respondent | null = null;
  if (sp.edit) {
    const { data: one } = await supabase.from('respondents').select('*').eq('id', sp.edit).maybeSingle();
    editing = (one as Respondent) ?? null;
  }
  const showForm = !!editing || sp.baru === '1';

  return (
    <div className="p-3 p-lg-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h1 className="h3 page-title mb-0">Responden</h1>
          <p className="text-secondary mb-0">
            {ROLES.map((r, i) => ({ r, n: counts[i].count ?? 0 })).filter((x) => x.n > 0).map((x) => `${x.n} ${ROLE_LABEL[x.r].toLowerCase()}`).join(', ') || 'Belum ada responden'}
          </p>
        </div>
        <div className="d-flex gap-2">
          <ImportExcel />
          <Link href="/admin/responden?baru=1" className="btn btn-primary"><i className="bi bi-person-plus me-1" />Tambah</Link>
        </div>
      </div>

      {sp.ok && <div className="alert alert-success py-2">{sp.ok}</div>}
      {sp.e && <div className="alert alert-danger py-2">{sp.e}</div>}

      {showForm && (
        <form action={saveRespondent} className="card border-0 shadow-sm mb-3">
          <div className="card-body p-3 p-md-4">
            <h2 className="h6 fw-bold mb-3">{editing ? 'Ubah responden' : 'Tambah responden'}</h2>
            <input type="hidden" name="id" value={editing?.id ?? ''} />
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-semibold" htmlFor="rn">Nama lengkap</label>
                <input id="rn" name="name" className="form-control" required defaultValue={editing?.name ?? ''} />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold" htmlFor="ri">Nomor induk (NIT untuk siswa, NIP/NUPTK untuk guru &amp; kepsek)</label>
                <input id="ri" name="identifier" className="form-control" required defaultValue={editing?.identifier ?? ''} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold" htmlFor="rr">Peran</label>
                <select id="rr" name="role" className="form-select" defaultValue={editing?.role ?? 'siswa'}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold" htmlFor="rk">Kelas (siswa), kelas anak (orang tua), atau tahun lulus (alumni)</label>
                <input id="rk" name="class_name" className="form-control" list="daftar-kelas" placeholder="mis. XI NKPI 1" defaultValue={editing?.class_name ?? ''} />
                <datalist id="daftar-kelas">{classes.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold" htmlFor="rs">Mapel / jabatan / pekerjaan (peran lainnya)</label>
                <input id="rs" name="subject" className="form-control" defaultValue={editing?.subject ?? ''} />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold" htmlFor="rp">No. WhatsApp (opsional)</label>
                <input id="rp" name="phone" className="form-control" inputMode="tel" placeholder="08xxxxxxxxxx" defaultValue={editing?.phone ?? ''} />
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <div className="form-check form-switch mb-2">
                  <input className="form-check-input" type="checkbox" id="ra" name="active" defaultChecked={editing ? editing.active : true} />
                  <label className="form-check-label" htmlFor="ra">Aktif (ikut dibuatkan link angket)</label>
                </div>
              </div>
            </div>
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-primary">Simpan</button>
              <Link href="/admin/responden" className="btn btn-light">Batal</Link>
            </div>
          </div>
        </form>
      )}

      <form className="d-flex flex-wrap gap-2 mb-3" method="get">
        <input name="q" className="form-control" style={{ maxWidth: 260 }} placeholder="Cari nama / NIT / NIP" defaultValue={sp.q ?? ''} aria-label="Cari" />
        <select name="peran" className="form-select" style={{ maxWidth: 180 }} defaultValue={sp.peran ?? ''} aria-label="Peran">
          <option value="">Semua peran</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <select name="kelas" className="form-select" style={{ maxWidth: 180 }} defaultValue={sp.kelas ?? ''} aria-label="Kelas">
          <option value="">Semua kelas</option>
          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn btn-outline-primary">Cari</button>
      </form>

      {people.length === 0 ? (
        <div className="list-card text-center py-4">Belum ada data. Tambah satu per satu atau impor dari Excel.</div>
      ) : (
        <>
          <div className="card-s d-none d-md-block overflow-hidden">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead><tr><th className="ps-3">Nama</th><th>NIT / NIP</th><th>Peran</th><th>Kelas / keterangan</th><th>WA</th><th className="text-end pe-3">Aksi</th></tr></thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.id} className={p.active ? '' : 'text-secondary'}>
                      <td className="ps-3 fw-semibold">{p.name}{!p.active && <span className="badge-soft st-ditutup ms-2">Nonaktif</span>}</td>
                      <td>{p.identifier}</td>
                      <td><span className={`badge-soft role ${p.role}`}>{ROLE_SHORT[p.role]}</span></td>
                      <td>{p.class_name ?? p.subject ?? '—'}</td>
                      <td>{p.phone ? <i className="bi bi-whatsapp text-success" title={p.phone} /> : '—'}</td>
                      <td className="text-end pe-3">
                        <div className="d-inline-flex gap-1">
                          <Link className="btn btn-sm btn-outline-secondary icon-btn" href={`/admin/responden?edit=${p.id}`} title="Ubah" aria-label="Ubah"><i className="bi bi-pencil" /></Link>
                          <form action={deleteRespondent}>
                            <input type="hidden" name="id" value={p.id} />
                            <ConfirmButton className="btn btn-sm btn-outline-danger icon-btn" title="Hapus" message={`Hapus ${p.name}? Link angket miliknya ikut terhapus. Jawabannya tetap tersimpan tanpa nama.`}>
                              <i className="bi bi-trash" />
                            </ConfirmButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="d-md-none d-flex flex-column gap-2">
            {people.map((p) => (
              <div key={p.id} className="list-card d-flex align-items-center gap-2">
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-semibold text-truncate">{p.name}</div>
                  <div className="small text-secondary">
                    <span className={`badge-soft role ${p.role} me-1`}>{ROLE_SHORT[p.role]}</span>
                    {p.class_name ?? p.subject ?? ''} ({p.identifier})
                  </div>
                </div>
                <Link className="btn btn-sm btn-outline-secondary icon-btn" href={`/admin/responden?edit=${p.id}`} aria-label="Ubah"><i className="bi bi-pencil" /></Link>
                <form action={deleteRespondent}>
                  <input type="hidden" name="id" value={p.id} />
                  <ConfirmButton className="btn btn-sm btn-outline-danger icon-btn" title="Hapus" message={`Hapus ${p.name}?`}>
                    <i className="bi bi-trash" />
                  </ConfirmButton>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
