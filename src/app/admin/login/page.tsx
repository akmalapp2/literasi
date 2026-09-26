import type { Metadata } from 'next';
import LoginForm from '@/components/admin/LoginForm';
import { getSettings, toBrand } from '@/lib/settings';

export const metadata: Metadata = { title: 'Masuk admin', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; e?: string }> }) {
  const sp = await searchParams;
  const brand = toBrand(await getSettings());
  const next = sp.next && sp.next.startsWith('/admin') ? sp.next : '/admin';
  return <LoginForm brand={brand} next={next} notAdmin={sp.e === 'bukan-admin'} />;
}
