import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import FormEditor from '@/components/editor/FormEditor';
import { requireAdmin } from '@/lib/auth';
import { getSettings, toBrand } from '@/lib/settings';
import type { FormRow, Question } from '@/lib/types';
import { getBaseUrl } from '@/lib/url';

export const metadata: Metadata = { title: 'Editor angket' };

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: form } = await supabase.from('forms').select('*').eq('id', id).maybeSingle();
  if (!form) notFound();
  const [{ data: qs }, { count }, settings, baseUrl] = await Promise.all([
    supabase.from('questions').select('id, type, title, required, roles, options').eq('form_id', id).order('position'),
    supabase.from('responses').select('id', { count: 'exact', head: true }).eq('form_id', id),
    getSettings(),
    getBaseUrl(),
  ]);

  return (
    <FormEditor
      form={form as FormRow}
      initialQuestions={(qs ?? []) as Question[]}
      brand={toBrand(settings)}
      defaultView={settings.editor_view}
      defaultFillDesign={settings.default_fill_design}
      responseCount={count ?? 0}
      baseUrl={baseUrl}
    />
  );
}
