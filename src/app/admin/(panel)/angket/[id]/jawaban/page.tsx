import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DeleteResponseButton from '@/components/admin/DeleteResponseButton';
import { requireAdmin } from '@/lib/auth';
import { fetchAll } from '@/lib/fetch-all';
import { periodKey, periodLabel, type RepeatMode } from '@/lib/period';
import { cellText, witaDateTime, type ReportQuestion } from '@/lib/report';
import { ROLE_LABEL, ROLE_SHORT, neutral, roleDetail } from '@/lib/text';
import { ROLES, type FormRow, type Role } from '@/lib/types';

export const metadata: Metadata = { title: 'Jawaban responden' };

const PER_PAGE = 30;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type SP = { responden?: string; q?: string; peran?: string; kelas?: string; tanggal?: string; hal?: string; ok?: string };
type Resp = {
  id: string;
  submitted_at: string;
  role: Role | null;
  class_name: string | null;
  source: string | null;
  respondent_id: string | null;
  respondents: { name: string; identifier: string; role: Role; class_name: string | null; subject: string | null } | null;
};

export default async function AnswersPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: fdata } = await supabase.from('forms').select('*').eq('id', id).maybeSingle();
  if (!fdata) notFound();
  const form = fdata as FormRow;
  const mode = (form.repeat_mode ?? 'sekali') as RepeatMode;

  const { data: qrows } = await supabase.from('questions').select('id, type, title, options, settings, roles').eq('form_id', id).order('position');
  const questions = (qrows ?? []) as (ReportQuestion & { roles: Role[] })[];

  // ---- Saringan ----
  const peran = ROLES.includes(sp.peran as Role) ? (sp.peran as Role) : null;
  const kelas = sp.kelas?.trim() || null;
  const tanggal = sp.tanggal && DATE_RE.test(sp.tanggal) ? sp.tanggal : null;
  const page = Math.max(1, Number(sp.hal) || 1);
  const term = (sp.q ?? '').replace(/[%,()]/g, ' ').trim();

  type Person = { id: string; name: string; identifier: string; role: Role; class_name: string | null; subject: string | null; active: boolean };
  let person: Person | null = null;
  if (sp.responden) {
    const { data } = await supabase.from('respondents').select('id, name, identifier, role, class_name, subject, active').eq('id', sp.responden).maybeSingle();
    person = (data as Person | null) ?? null;
  }

  let matchIds: string[] | null = null;
  if (!person && term) {
    const found = await fetchAll<{ id: string }>((a, b) =>
      supabase.from('respondents').select('id').or(`name.ilike.%${term}%,identifier.ilike.%${term}%`).order('id').range(a, b),
    );
    matchIds = found.map((x) => x.id);
  }

  let rows: Resp[] = [];
  let total = 0;
  if (matchIds === null || matchIds.length) {
    let q = supabase
      .from('responses')
      .select('id, submitted_at, role, class_name, source, respondent_id, respondents(name, identifier, role, class_name, subject)', { count: 'exact' })
      .eq('form_id', id);
    if (person) q = q.eq('respondent_id', person.id);
    if (matchIds) q = q.in('respondent_id', matchIds.slice(0, 300));
    if (!person && peran) q = q.eq('role', peran);
    if (!person && kelas) q = q.eq('class_name', kelas);
    if (tanggal) q = q.gte('submitted_at', `${tanggal}T00:00:00+08:00`).lte('submitted_at', `${tanggal}T23:59:59.999+08:00`);
    const from = person ? 0 : (page - 1) * PER_PAGE;
    const to = person ? 999 : from + PER_PAGE - 1;
    const { data, count } = await q.order('submitted_at', { ascending: false }).range(from, to);
    rows = (data ?? []) as unknown as Resp[];
    total = count ?? rows.length;
  }

  const answers = new Map<string, Record<string, string | string[]>>();
  if (rows.length) {
    const all = await fetchAll<{ response_id: string; question_id: string; value_text: string | null; value_list: string[] | null }>((a, b) =>
      supabase.from('answers').select('response_id, question_id, value_text, value_list').in('response_id', rows.map((r) => r.id)).order('id').range(a, b),
    );
    for (const x of all) {
      const rec = answers.get(x.response_id) ?? {};
      rec[x.question_id] = x.value_list ?? x.value_text ?? '';
      answers.set(x.response_id, rec);
    }
  }

  const classes = Array.from(
    new Set(
      (await fetchAll<{ class_name: string }>((a, b) =>
        supabase.from('respondents').select('class_name').in('role', ['siswa', 'ortu']).not('class_name', 'is', null).order('id').range(a, b),
      )).map((c) => c.class_name),
    ),
  ).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (extra: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    const base: Record<string, string | null> = { q: term || null, peran, kelas, tanggal, responden: person?.id ?? null };
    for (const [k, v] of Object.entries({ ...base, ...extra })) if (v !== null && v !== '') p.set(k, String(v));
    const s = p.toString();
    return `/admin/angket/${id}/jawaban${s ? `?${s}` : ''}`;
  };

  return (
    <div className="p-3 p-lg-4" style={{ maxWidth: 1000 }}>
      <Link href={person ? `/admin/angket/${id}/jawaban` : `/admin/angket/${id}`} className="btn btn-sm btn-link px-0 mb-2 text-decoration-none">
        <i className="bi bi-arrow-left" /> {person ? 'Semua jawaban' : 'Kembali ke editor'}
      </Link>

      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
        <div className="min-w-0">
          <h1 className="h3 page-title mb-0">{person ? person.name : 'Semua jawaban'}</h1>
          <p className="text-secondary mb-0">
            {person
              ? <>{roleDetail(person.role, person.class_name, person.subject)} · {person.identifier}{!person.active && <span className="badge-soft st-ditutup ms-2">Nonaktif</span>}</>
              : form.title}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link className="btn btn-primary" href={`/admin/angket/${id}/susulan${person ? `?responden=${person.id}` : ''}`}>
            <i className="bi bi-journal-plus me-1" />Isi susulan
          </Link>
          <Link className="btn btn-outline-primary" href={`/admin/angket/${id}/laporan`}><i className="bi bi-download me-1" />Unduh hasil</Link>
        </div>
      </div>

      {sp.ok && <div className="alert alert-success py-2">{sp.ok}</div>}

      {!person && (
        <form className="card border-0 shadow-sm mb-3" method="get">
          <div className="card-body d-flex flex-wrap gap-2 align-items-center">
            <input name="q" className="form-control" style={{ maxWidth: 240 }} placeholder="Cari nama / NIT / NIP" defaultValue={term} aria-label="Cari" />
            <select name="peran" className="form-select" style={{ maxWidth: 190 }} defaultValue={peran ?? ''} aria-label="Peran">
              <option value="">Semua peran</option>
              {form.targets.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            {classes.length > 0 && (
              <select name="kelas" className="form-select" style={{ maxWidth: 170 }} defaultValue={kelas ?? ''} aria-label="Kelas">
                <option value="">Semua kelas</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <input name="tanggal" type="date" className="form-control" style={{ maxWidth: 180 }} defaultValue={tanggal ?? ''} aria-label="Tanggal kirim" />
            <button className="btn btn-outline-primary">Cari</button>
            {(term || peran || kelas || tanggal) && <Link href={`/admin/angket/${id}/jawaban`} className="btn btn-link">Hapus saringan</Link>}
          </div>
        </form>
      )}

      <p className="small text-secondary">
        {total} jawaban{person ? '' : ' ditemukan'}
        {mode !== 'sekali' && person ? `, pengisian ${mode === 'mingguan' ? 'setiap minggu' : 'setiap hari'}` : ''}. Terbaru di atas.
      </p>

      {rows.length === 0 ? (
        <div className="list-card text-center py-4 text-secondary">
          {person ? 'Responden ini belum punya jawaban.' : 'Tidak ada jawaban yang cocok.'}
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {rows.map((r) => {
            const who = r.respondents;
            const rec = answers.get(r.id) ?? {};
            const role = (r.role ?? who?.role ?? null) as Role | null;
            const qs2 = questions.filter((q) => !role || q.roles.includes(role));
            const when = witaDateTime(r.submitted_at);
            return (
              <div key={r.id} className="card-s">
                <div className="d-flex flex-wrap align-items-center gap-2 p-3 border-bottom">
                  <div className="flex-grow-1 min-w-0">
                    {!person && (
                      <div className="fw-semibold">
                        {who ? (
                          <Link href={qs({ responden: r.respondent_id, hal: null })} className="text-body">{who.name}</Link>
                        ) : '(anonim)'}
                        {role && <span className={`badge-soft role ${role} ms-2`}>{ROLE_SHORT[role]}</span>}
                        {r.class_name && <span className="small text-secondary ms-2">{r.class_name}</span>}
                      </div>
                    )}
                    <div className="small text-secondary">
                      <i className="bi bi-clock me-1" />{when} WITA
                      {mode !== 'sekali' && <> · {periodLabel(periodKey(mode, r.submitted_at))}</>}
                      {r.source === 'admin' && <span className="badge-soft st-draf ms-2">Susulan oleh admin</span>}
                    </div>
                  </div>
                  <DeleteResponseButton responseId={r.id} formId={id} label={`${who?.name ?? 'anonim'} (${when})`} />
                </div>
                <dl className="row mb-0 p-3 small">
                  {qs2.map((q, i) => {
                    const v = cellText(q, rec[q.id]);
                    return (
                      <div key={q.id} className="col-12 d-flex flex-column flex-md-row gap-md-3 py-1 border-bottom border-light">
                        <dt className="fw-normal text-secondary" style={{ flex: '0 0 38%' }}>{i + 1}. {neutral(q.title)}</dt>
                        <dd className="mb-0 fw-semibold" style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{v || <span className="text-secondary fw-normal">—</span>}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            );
          })}
        </div>
      )}

      {!person && pages > 1 && (
        <nav className="d-flex justify-content-center align-items-center gap-2 mt-3" aria-label="Halaman">
          <Link className={`btn btn-sm btn-outline-secondary ${page <= 1 ? 'disabled' : ''}`} href={qs({ hal: page - 1 })}>‹ Sebelumnya</Link>
          <span className="small text-secondary">Halaman {page} dari {pages}</span>
          <Link className={`btn btn-sm btn-outline-secondary ${page >= pages ? 'disabled' : ''}`} href={qs({ hal: page + 1 })}>Berikutnya ›</Link>
        </nav>
      )}
    </div>
  );
}
