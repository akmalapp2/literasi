import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ParticipationPanel, { type Person } from '@/components/admin/ParticipationPanel';
import TokenManager, { type TokenRow } from '@/components/admin/TokenManager';
import { fetchAll } from '@/lib/fetch-all';
import { scheduleText } from '@/lib/form-window';
import { filledIds } from '@/lib/filled';
import { requireAdmin } from '@/lib/auth';
import type { FormRow } from '@/lib/types';
import { getBaseUrl } from '@/lib/url';

export const metadata: Metadata = { title: 'Link responden' };

export default async function TokensPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ peran?: string; kelas?: string; status?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('forms').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const form = data as FormRow;

  const repeatMode = form.repeat_mode ?? 'sekali';
  const [rows, people, baseUrl, done] = await Promise.all([
    fetchAll((a, b) =>
      supabase
        .from('access_tokens')
        .select('id, token, used_at, respondent_id, respondents(id, name, identifier, role, class_name, subject, phone)')
        .eq('form_id', id)
        .order('id')
        .range(a, b),
    ),
    fetchAll<Person>((a, b) =>
      supabase.from('respondents').select('id, name, role, class_name').eq('active', true).in('role', form.targets).order('id').range(a, b),
    ),
    getBaseUrl(),
    filledIds(supabase, id, repeatMode),
  ]);
  // Sudah mengisi = punya jawaban pada periode sekarang (satu sumber: data jawaban).
  const doneIds = [...done];
  const initial = { peran: sp.peran ?? '', kelas: sp.kelas ?? '', status: sp.status ?? '' };

  const tokens = ((rows ?? []) as unknown as TokenRow[])
    .filter((r) => r.respondents)
    .sort((a, b) =>
      (a.respondents.role + (a.respondents.class_name ?? '') + a.respondents.name).localeCompare(
        b.respondents.role + (b.respondents.class_name ?? '') + b.respondents.name, 'id'),
    );

  return (
    <div className="p-3 p-lg-4">
      <Link href={`/admin/angket/${id}`} className="btn btn-sm btn-link px-0 mb-2 text-decoration-none">
        <i className="bi bi-arrow-left" /> Kembali ke editor
      </Link>
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
        <div>
          <h1 className="h3 page-title mb-0">Link responden</h1>
          <p className="text-secondary mb-0">{form.title}</p>
        </div>
      </div>
      {form.access_mode !== 'token' && (
        <div className="alert alert-info small">
          Angket ini memakai mode <strong>Link umum</strong>{form.require_code ? <> dengan kode angket <code>{form.access_code}</code></> : null}.
          Link pribadi tetap bisa dipakai, tetapi responden juga bisa masuk lewat <code>{baseUrl}/f/{form.slug}</code>.
        </div>
      )}
      <ParticipationPanel
        formTitle={form.title}
        people={people}
        doneIds={doneIds}
        repeatMode={repeatMode}
        entryUrl={form.access_mode === 'token' ? null : `${baseUrl}/f/${form.slug}`}
        scheduleText={scheduleText(form)}
        formId={id}
      />
      <TokenManager
        key={`${initial.peran}|${initial.kelas}|${initial.status}`}
        initial={initial}
        doneIds={doneIds}
        formId={id} formTitle={form.title} tokens={tokens} eligible={people.length} baseUrl={baseUrl} targets={form.targets} repeatMode={form.repeat_mode ?? 'sekali'} />
    </div>
  );
}
