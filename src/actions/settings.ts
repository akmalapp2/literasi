'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function saveSettings(formData: FormData) {
  const { supabase } = await requireAdmin();
  const s = (k: string) => String(formData.get(k) ?? '').trim();

  const update: Record<string, unknown> = {
    app_name: s('app_name') || 'Gerakan Literasi Sekolah',
    school_name: s('school_name') || 'SMKN 3 Kepulauan Selayar',
    default_fill_design: s('default_fill_design') === 'B' ? 'B' : 'A',
    editor_view: s('editor_view') === 'kartu' ? 'kartu' : 'panel',
    updated_at: new Date().toISOString(),
  };

  if (formData.get('reset_logo') === 'on') update.logo_url = null;

  const logo = formData.get('logo');
  if (logo instanceof File && logo.size > 0) {
    if (!logo.type.startsWith('image/')) redirect('/admin/pengaturan?e=' + encodeURIComponent('File logo harus berupa gambar.'));
    if (logo.size > 900 * 1024) redirect('/admin/pengaturan?e=' + encodeURIComponent('Ukuran logo maksimal 900 KB.'));
    const ext = (logo.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `logo-${Date.now()}.${ext}`;
    const storage = createAdminClient().storage.from('branding');
    const { error } = await storage.upload(path, logo, { contentType: logo.type, upsert: true });
    if (error) redirect('/admin/pengaturan?e=' + encodeURIComponent('Gagal mengunggah logo: ' + error.message));
    update.logo_url = storage.getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from('app_settings').update(update).eq('id', 1);
  if (error) redirect('/admin/pengaturan?e=' + encodeURIComponent('Gagal menyimpan: ' + error.message));

  revalidatePath('/', 'layout');
  redirect('/admin/pengaturan?ok=1');
}
