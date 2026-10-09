import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminFillForm, { type FillPerson } from '@/components/admin/AdminFillForm';
import { requireAdmin } from '@/lib/auth';
import { fetchAll } from '@/lib/fetch-all';
import { ROLES, type FormRow, type Question } from '@/lib/types';

export const metadata: Metadata = { title: 'Isi susulan' };

export default async function FillLaterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ responden?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const { data } = await supabase.from('forms').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const form = data as FormRow;

  const [{ data: qrows }, people] = await Promise.all([
    supabase.from('questions').select('id, type, title, required, roles, options, settings').eq('form_id', id).order('position'),
    fetchAll<FillPerson>((a, b) =>
      supabase.from('respondents').select('id, name, identifier, role, class_name').in('role', form.targets).order('id').range(a, b),
    ),
  ]);
  people.sort(
    (a, b) =>
      ROLES.indexOf(a.role) - ROLES.indexOf(b.role) ||
      (a.class_name ?? '').localeCompare(b.class_name ?? '', 'id', { numeric: true }) ||
      a.name.localeCompare(b.name, 'id'),
  );

  return (
    <div className="p-3 p-lg-4" style={{ maxWidth: 820 }}>
      <Link href={`/admin/angket/${id}/jawaban${sp.responden ? `?responden=${sp.responden}` : ''}`} className="btn btn-sm btn-link px-0 mb-2 text-decoration-none">
        <i className="bi bi-arrow-left" /> Kembali ke jawaban
      </Link>
      <h1 className="h3 page-title mb-0">Isi susulan</h1>
      <p className="text-secondary">{form.title}</p>
      <AdminFillForm
        formId={id}
        repeatMode={form.repeat_mode ?? 'sekali'}
        people={people}
        initialPerson={people.some((p) => p.id === sp.responden) ? sp.responden! : ''}
        questions={((qrows ?? []) as Question[]).map((q) => ({ ...q, settings: q.settings ?? {} }))}
      />
    </div>
  );
}
