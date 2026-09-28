import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReportDownloader from '@/components/admin/ReportDownloader';
import { requireAdmin } from '@/lib/auth';
import type { Role } from '@/lib/types';

export const metadata: Metadata = { title: 'Unduh hasil' };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: form } = await supabase.from('forms').select('id, title, targets').eq('id', id).maybeSingle();
  if (!form) notFound();

  return (
    <div className="p-3 p-lg-4" style={{ maxWidth: 900 }}>
      <Link href={`/admin/angket/${id}`} className="btn btn-sm btn-link px-0 mb-2 text-decoration-none">
        <i className="bi bi-arrow-left" /> Kembali ke editor
      </Link>
      <h1 className="h3 page-title mb-0">Unduh hasil</h1>
      <p className="text-secondary">{form.title as string}</p>
      <ReportDownloader formId={id} targets={form.targets as Role[]} />
    </div>
  );
}
