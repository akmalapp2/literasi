import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EntryFlow from '@/components/fill/EntryFlow';
import StatusCard from '@/components/StatusCard';
import { needsId } from '@/lib/access';
import { formWindow, resultsVisible } from '@/lib/form-window';
import { getSettings, toBrand } from '@/lib/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FormRow, Question } from '@/lib/types';

export const metadata: Metadata = { title: 'Isi angket', robots: { index: false } };

export default async function EntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getSettings();
  const brand = toBrand(settings);
  const db = createAdminClient();

  const { data } = await db.from('forms').select('*').eq('slug', slug).maybeSingle();
  if (!data) notFound();
  const form = data as FormRow;

  const w = formWindow(form);
  if (!w.open) return <StatusCard brand={brand} icon="bi-clock" title={w.title} text={w.text} />;

  if (form.access_mode === 'token') {
    return (
      <StatusCard brand={brand} icon="bi-qr-code" title="Gunakan link pribadi" text="Angket ini diisi lewat link atau kartu QR pribadi yang dibagikan sekolah. Hubungi wali kelas atau admin jika belum menerimanya." />
    );
  }

  // Pertanyaan hanya dimuat bila ada peran yang mengisi tanpa nomor induk;
  // yang wajib NIT/NIP mengisi di /isi/[token] setelah dicocokkan.
  const anyAnon = form.targets.some((r) => !needsId(form, r));
  const { data: qrows } = !anyAnon ? { data: [] } : await db
    .from('questions')
    .select('id, type, title, required, roles, options, settings')
    .eq('form_id', form.id)
    .order('position');
  const design = form.fill_design === 'ikut' ? settings.default_fill_design : form.fill_design;

  return (
    <EntryFlow
      brand={brand}
      form={{
        id: form.id, title: form.title, description: form.description, slug: form.slug,
        showResultsLink: resultsVisible(form), access_mode: form.access_mode, open_id: form.open_id ?? 'semua', require_code: !!form.require_code,
      }}
      questions={(qrows ?? []) as Question[]}
      design={design}
      targets={form.targets}
      turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null}
    />
  );
}
