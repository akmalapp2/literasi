import type { Metadata } from 'next';
import Link from 'next/link';
import FillApp from '@/components/fill/FillApp';
import StatusCard from '@/components/StatusCard';
import { formWindow, resultsVisible, scheduleText } from '@/lib/form-window';
import { getSettings, toBrand } from '@/lib/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import { roleDetail } from '@/lib/text';
import type { FormRow, Question, Role } from '@/lib/types';
import { PERIOD_WORD, usedThisPeriod } from '@/lib/period';

export const metadata: Metadata = { title: 'Isi angket', robots: { index: false } };

type Person = { name: string; role: Role; class_name: string | null; subject: string | null; active: boolean };

export default async function IsiPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw).toUpperCase();
  const settings = await getSettings();
  const brand = toBrand(settings);
  const db = createAdminClient();

  const { data: tok } = await db
    .from('access_tokens')
    .select('id, used_at, form_id, respondents(name, role, class_name, subject, active)')
    .eq('token', token)
    .maybeSingle();
  if (!tok) {
    return <StatusCard brand={brand} icon="bi-link-45deg" tone="warn" title="Link tidak dikenali" text="Periksa kembali link atau QR dari sekolah. Jika masih gagal, hubungi admin sekolah." />;
  }

  const { data: formData } = await db.from('forms').select('*').eq('id', tok.form_id).single();
  const form = formData as FormRow;

  if (usedThisPeriod(form.repeat_mode, tok.used_at)) {
    const repeat = form.repeat_mode !== 'sekali';
    return (
      <StatusCard brand={brand} icon="bi-check-lg" tone="ok" title={repeat ? `Sudah mengisi ${PERIOD_WORD[form.repeat_mode]}` : 'Jawaban sudah terkirim'}
        text={repeat
          ? `Terima kasih. Link ini bisa dipakai lagi ${form.repeat_mode === 'mingguan' ? 'minggu depan' : 'besok'}${scheduleText(form) ? `, sesuai jadwal ${scheduleText(form)}` : ''}.`
          : 'Terima kasih. Setiap link hanya bisa dipakai satu kali.'}>
        {resultsVisible(form) && <Link className="btn btn-outline-primary" href={`/hasil/${form.slug}`}>Lihat hasil angket</Link>}
      </StatusCard>
    );
  }

  const person = tok.respondents as unknown as Person;
  if (!person || !person.active) {
    return <StatusCard brand={brand} icon="bi-person-x" tone="warn" title="Link tidak aktif" text="Data responden untuk link ini sedang dinonaktifkan. Hubungi admin sekolah." />;
  }

  const w = formWindow(form);
  if (!w.open) return <StatusCard brand={brand} icon="bi-clock" title={w.title} text={w.text} />;

  const { data: qrows } = await db
    .from('questions')
    .select('id, type, title, required, roles, options, settings')
    .eq('form_id', form.id)
    .order('position');

  const detail = roleDetail(person.role, person.class_name, person.subject);
  const design = form.fill_design === 'ikut' ? settings.default_fill_design : form.fill_design;

  return (
    <FillApp
      brand={brand}
      form={{ id: form.id, title: form.title, description: form.description, slug: form.slug, showResultsLink: resultsVisible(form), repeatMode: form.repeat_mode }}
      questions={(qrows ?? []) as Question[]}
      design={design}
      targets={form.targets}
      mode="token"
      token={token}
      respondent={{ name: person.name, role: person.role, detail }}
    />
  );
}
