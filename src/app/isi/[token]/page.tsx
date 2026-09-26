import type { Metadata } from 'next';
import Link from 'next/link';
import FillApp from '@/components/fill/FillApp';
import StatusCard from '@/components/StatusCard';
import { formWindow, resultsVisible } from '@/lib/form-window';
import { getSettings, toBrand } from '@/lib/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import { ROLE_LABEL } from '@/lib/text';
import type { FormRow, Question, Role } from '@/lib/types';

export const metadata: Metadata = { title: 'Isi angket', robots: { index: false } };

type Person = { name: string; role: Role; class_name: string | null; subject: string | null };

export default async function IsiPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw).toUpperCase();
  const settings = await getSettings();
  const brand = toBrand(settings);
  const db = createAdminClient();

  const { data: tok } = await db
    .from('access_tokens')
    .select('id, used_at, form_id, respondents(name, role, class_name, subject)')
    .eq('token', token)
    .maybeSingle();
  if (!tok) {
    return <StatusCard brand={brand} icon="bi-link-45deg" tone="warn" title="Link tidak dikenali" text="Periksa kembali link atau QR dari sekolah. Jika masih gagal, hubungi admin sekolah." />;
  }

  const { data: formData } = await db.from('forms').select('*').eq('id', tok.form_id).single();
  const form = formData as FormRow;

  if (tok.used_at) {
    return (
      <StatusCard brand={brand} icon="bi-check-lg" tone="ok" title="Jawaban sudah terkirim" text="Terima kasih. Setiap link hanya bisa dipakai satu kali.">
        {resultsVisible(form) && <Link className="btn btn-outline-primary" href={`/hasil/${form.slug}`}>Lihat hasil angket</Link>}
      </StatusCard>
    );
  }

  const w = formWindow(form);
  if (!w.open) return <StatusCard brand={brand} icon="bi-clock" title={w.title} text={w.text} />;

  const person = tok.respondents as unknown as Person;
  const { data: qrows } = await db
    .from('questions')
    .select('id, type, title, required, roles, options, settings')
    .eq('form_id', form.id)
    .order('position');

  const detail =
    person.role === 'siswa'
      ? `Siswa${person.class_name ? `, kelas ${person.class_name}` : ''}`
      : `${ROLE_LABEL[person.role]}${person.subject ? `, ${person.subject}` : ''}`;
  const design = form.fill_design === 'ikut' ? settings.default_fill_design : form.fill_design;

  return (
    <FillApp
      brand={brand}
      form={{ id: form.id, title: form.title, description: form.description, slug: form.slug, showResultsLink: resultsVisible(form) }}
      questions={(qrows ?? []) as Question[]}
      design={design}
      targets={form.targets}
      mode="token"
      token={token}
      respondent={{ name: person.name, role: person.role, detail }}
    />
  );
}
