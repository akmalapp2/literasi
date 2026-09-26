'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { usesClass } from '@/lib/text';
import { ROLES, type ActionResult, type Role } from '@/lib/types';

const str = (v: FormDataEntryValue | null) => String(v ?? '').trim();

export async function saveRespondent(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData.get('id'));
  const role = str(formData.get('role')) as Role;
  const row = {
    name: str(formData.get('name')),
    identifier: str(formData.get('identifier')),
    role,
    class_name: usesClass(role) ? str(formData.get('class_name')) || null : null,
    subject: !usesClass(role) ? str(formData.get('subject')) || null : null,
    phone: str(formData.get('phone')).replace(/[^\d+]/g, '') || null,
    active: formData.get('active') === 'on',
  };
  const back = (msg: string) =>
    redirect(`/admin/responden?${id ? `edit=${id}&` : 'baru=1&'}e=${encodeURIComponent(msg)}`);

  if (!row.name) back('Nama wajib diisi.');
  if (!row.identifier) back('Nomor induk wajib diisi.');
  if (!ROLES.includes(role)) back('Peran tidak valid.');

  const { error } = id
    ? await supabase.from('respondents').update(row).eq('id', id)
    : await supabase.from('respondents').insert(row);
  if (error) back(error.code === '23505' ? 'Nomor induk ini sudah terdaftar.' : 'Gagal menyimpan: ' + error.message);

  revalidatePath('/admin/responden');
  redirect('/admin/responden?ok=' + encodeURIComponent(id ? 'Data responden diperbarui.' : 'Responden ditambahkan.'));
}

export async function deleteRespondent(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData.get('id'));
  if (id) await supabase.from('respondents').delete().eq('id', id);
  revalidatePath('/admin/responden');
}

export type ImportRow = {
  name: string;
  identifier: string;
  role: Role;
  class_name: string | null;
  subject: string | null;
  phone: string | null;
};

export async function importRespondents(rows: ImportRow[]): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const clean = rows
    .map((r) => ({
      name: String(r.name ?? '').trim(),
      identifier: String(r.identifier ?? '').trim(),
      role: ROLES.includes(r.role) ? r.role : 'siswa',
      class_name: usesClass(r.role) ? (String(r.class_name ?? '').trim() || null) : null,
      subject: !usesClass(r.role) ? (String(r.subject ?? '').trim() || null) : null,
      phone: String(r.phone ?? '').replace(/[^\d+]/g, '') || null,
      active: true,
    }))
    .filter((r) => r.name && r.identifier);

  // Buang nomor induk ganda di file yang sama (yang terakhir dipakai).
  const unique = Array.from(new Map(clean.map((r) => [r.identifier, r])).values());
  if (!unique.length) return { ok: false, error: 'Tidak ada baris yang valid. Pastikan kolom Nama dan Nomor Induk terisi.' };

  for (let i = 0; i < unique.length; i += 500) {
    const { error } = await supabase
      .from('respondents')
      .upsert(unique.slice(i, i + 500), { onConflict: 'identifier' });
    if (error) return { ok: false, error: 'Gagal mengimpor: ' + error.message };
  }
  revalidatePath('/admin/responden');
  return { ok: true, message: `${unique.length} responden berhasil diimpor atau diperbarui.` };
}
