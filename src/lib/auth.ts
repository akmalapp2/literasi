import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

/** Pastikan yang memanggil adalah admin. Dipakai di setiap halaman & aksi admin. */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: ok } = await supabase.rpc('is_admin');
  if (!ok) redirect('/admin/login?e=bukan-admin');
  return { supabase, user };
}

/** Tanpa redirect, untuk halaman publik yang menampilkan info tambahan bagi admin. */
export async function isAdminSession(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.rpc('is_admin');
    return !!data;
  } catch {
    return false;
  }
}
