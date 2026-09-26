import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TokenManager, { type TokenRow } from '@/components/admin/TokenManager';
import { requireAdmin } from '@/lib/auth';
import type { FormRow } from '@/lib/types';
import { getBaseUrl } from '@/lib/url';

export const metadata: Metadata = { title: 'Link responden' };

export default async function TokensPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('forms').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const form = data as FormRow;

  const [{ data: rows }, { count: eligible }, baseUrl] = await Promise.all([
    supabase
      .from('access_tokens')
      .select('id, token, used_at, respondents(id, name, identifier, role, class_name, subject, phone)')
      .eq('form_id', id)
      .range(0, 9999),
    supabase.from('respondents').select('id', { count: 'exact', head: true }).eq('active', true).in('role', form.targets),
    getBaseUrl(),
  ]);

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
          Angket ini memakai mode <strong>{form.access_mode === 'kode' ? 'Kode angket + NISN/NIP' : 'Terbuka, anonim'}</strong>.
          Link pribadi tetap bisa dipakai, tetapi responden juga bisa masuk lewat <code>{baseUrl}/f/{form.slug}</code>.
        </div>
      )}
      <TokenManager formId={id} formTitle={form.title} tokens={tokens} eligible={eligible ?? 0} baseUrl={baseUrl} targets={form.targets} />
    </div>
  );
}
