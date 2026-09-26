'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { isChoice } from '@/lib/text';
import { generateSlug } from '@/lib/token';
import type { ActionResult, FormMeta, Question } from '@/lib/types';

const roleEnum = z.enum(['kepsek', 'guru', 'siswa']);

const metaSchema = z.object({
  title: z.string().trim().min(1, 'Judul angket wajib diisi.').max(200, 'Judul terlalu panjang.'),
  description: z.string().max(2000, 'Keterangan terlalu panjang.'),
  slug: z.string().regex(/^[a-z0-9-]{3,60}$/, 'Alamat angket hanya boleh huruf kecil, angka, dan tanda minus (3–60 karakter).'),
  targets: z.array(roleEnum).min(1, 'Pilih minimal satu sasaran angket.'),
  status: z.enum(['draf', 'terbit', 'ditutup']),
  access_mode: z.enum(['token', 'kode', 'terbuka']),
  access_code: z.string().trim().max(30).nullable(),
  fill_design: z.enum(['ikut', 'A', 'B']),
  opens_at: z.string().nullable(),
  closes_at: z.string().nullable(),
  public_results: z.boolean(),
  hide_text_public: z.boolean(),
  results_after_close: z.boolean(),
});

const questionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['short', 'long', 'radio', 'checkbox', 'dropdown']),
  title: z.string().trim().min(1, 'Ada pertanyaan yang teksnya masih kosong.').max(500, 'Teks pertanyaan terlalu panjang.'),
  required: z.boolean(),
  roles: z.array(roleEnum).min(1, 'Setiap pertanyaan harus tampil untuk minimal satu peran.'),
  options: z.array(z.string().max(200, 'Opsi jawaban terlalu panjang.')).max(30, 'Maksimal 30 opsi per pertanyaan.'),
});

export async function createForm() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('forms')
    .insert({ slug: generateSlug(), title: 'Angket baru', description: '' })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Gagal membuat angket.');
  await supabase.from('questions').insert({
    form_id: data.id,
    position: 0,
    type: 'radio',
    title: 'Seberapa sering {kamu} membaca buku di luar {tugas}?',
    required: true,
    options: ['Setiap hari', '2–3 kali seminggu', 'Seminggu sekali', 'Jarang'],
  });
  revalidatePath('/admin');
  redirect(`/admin/angket/${data.id}`);
}

export async function deleteForm(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (id) await supabase.from('forms').delete().eq('id', id);
  revalidatePath('/admin');
}

export async function saveForm(id: string, meta: FormMeta, questions: Question[]): Promise<ActionResult> {
  const { supabase } = await requireAdmin();

  const m = metaSchema.safeParse(meta);
  if (!m.success) return { ok: false, error: m.error.issues[0]?.message ?? 'Data angket tidak valid.' };
  const d = m.data;
  if (d.access_mode === 'kode' && !d.access_code) return { ok: false, error: 'Isi kode akses untuk mode "Kode angket + NISN/NIP".' };
  if (d.opens_at && d.closes_at && new Date(d.closes_at) <= new Date(d.opens_at))
    return { ok: false, error: 'Waktu ditutup harus setelah waktu dibuka.' };
  if (questions.length === 0) return { ok: false, error: 'Angket butuh minimal satu pertanyaan.' };

  const cleaned = questions.map((q) => ({
    ...q,
    options: isChoice(q.type) ? q.options.map((o) => o.trim()).filter(Boolean) : [],
  }));
  const qs = z.array(questionSchema).safeParse(cleaned);
  if (!qs.success) return { ok: false, error: qs.error.issues[0]?.message ?? 'Pertanyaan tidak valid.' };
  const bad = qs.data.findIndex((q) => isChoice(q.type) && q.options.length < 2);
  if (bad >= 0) return { ok: false, error: `Pertanyaan nomor ${bad + 1} butuh minimal 2 opsi jawaban.` };

  const { error: fErr } = await supabase
    .from('forms')
    .update({ ...d, access_code: d.access_code ? d.access_code.toUpperCase() : null })
    .eq('id', id);
  if (fErr) {
    if (fErr.code === '23505') return { ok: false, error: 'Alamat angket sudah dipakai angket lain. Ganti alamatnya.' };
    return { ok: false, error: 'Gagal menyimpan angket: ' + fErr.message };
  }

  // Hapus pertanyaan yang dibuang, lalu simpan sisanya (id tetap, jadi jawaban lama aman).
  const ids = qs.data.map((q) => q.id);
  const { error: dErr } = await supabase
    .from('questions')
    .delete()
    .eq('form_id', id)
    .not('id', 'in', `(${ids.join(',')})`);
  if (dErr) return { ok: false, error: 'Gagal menghapus pertanyaan: ' + dErr.message };

  const rows = qs.data.map((q, i) => ({
    id: q.id,
    form_id: id,
    position: i,
    type: q.type,
    title: q.title,
    required: q.required,
    roles: q.roles,
    options: q.options,
  }));
  const { error: uErr } = await supabase.from('questions').upsert(rows, { onConflict: 'id' });
  if (uErr) return { ok: false, error: 'Gagal menyimpan pertanyaan: ' + uErr.message };

  revalidatePath('/admin');
  revalidatePath(`/admin/angket/${id}`);
  return { ok: true, message: 'Perubahan tersimpan.' };
}
