import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PreviewBox from '@/components/admin/PreviewBox';
import { requireAdmin } from '@/lib/auth';
import { getSettings, toBrand } from '@/lib/settings';
import type { FormRow, Question } from '@/lib/types';

export const metadata: Metadata = { title: 'Pratinjau angket' };

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('forms').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const form = data as FormRow;
  const { data: qs } = await supabase.from('questions').select('id, type, title, required, roles, options').eq('form_id', id).order('position');
  const settings = await getSettings();
  const design = form.fill_design === 'ikut' ? settings.default_fill_design : form.fill_design;
  return (
    <PreviewBox
      brand={toBrand(settings)}
      form={{ id: form.id, title: form.title, description: form.description, slug: form.slug, showResultsLink: false }}
      questions={(qs ?? []) as Question[]}
      targets={form.targets}
      initialDesign={design}
    />
  );
}
