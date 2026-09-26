import type { Metadata } from 'next';
import AdminShell from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/auth';
import { getSettings, toBrand } from '@/lib/settings';

export const metadata: Metadata = { robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  const brand = toBrand(await getSettings());
  return (
    <AdminShell brand={brand} email={user.email ?? ''}>
      {children}
    </AdminShell>
  );
}
