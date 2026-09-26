'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { isChoice } from '@/lib/text';
import { generateSlug } from '@/lib/token';
import type { ActionResult, FormMeta, QSettings, Question } from '@/lib/types';

const roleEnum = z.enum(['kepsek', 'guru', 'tendik', 'siswa', 'ortu', 'alumni', 'umum']);

const metaSchema = z.object({
  title: z.string().trim().min(1, 'Judul angket wajib diisi.').max(200, 'Judul terlalu panjang.'),
  description: z.string().max(2000, 'Keterangan terlalu panjang.'),
  slug: z.string().regex(/^[a-z0-9-]{3,60}$/, 'Alamat angket hanya boleh huruf kecil, angka, dan tanda minus (3–60 karakter).'),
  targets: z.array(roleEnum).min(1, 'Pilih minimal satu sasaran angket.'),
  status: z.enum(['draf', 'terbit', 'ditutup']),
  access_mode: z.enum(['token', 'kode', 'terbuka']),
  access_code: z.string().trim().max(30).nullable(),
  open_id: z.enum(['none', 'siswa', 'semua']),
  fill_design: z.enum(['ikut', 'A', 'B']),
  opens_at: z.string().nullable(),
  closes_at: z.string().nullable(),
  open_days: z.array(z.number().int().min(0).max(6)).max(7),
  open_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Jam buka tidak valid.').nullable(),
  close_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Jam tutup tidak valid.').nullable(),
  public_results: z.boolean(),
  hide_text_public: z.boolean(),
  results_after_close: z.boolean(),
});

const settingsSchema = z.object({
  allow_other: z.boolean().optional(),
  other_label: z.string().max(100, 'Label opsi "Lainnya" terlalu panjang.').optional(),
  start_label: z.string().max(60, 'Label rentang terlalu panjang.').optional(),
  end_label: z.string().max(60, 'Label rentang terlalu panjang.').optional(),
  min: z.number().int().nullable().optional(),
  max: z.number().int().nullable().optional(),
});

const questionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['short', 'long', 'radio', 'checkbox', 'dropdown', 'date', 'range']),
  title: z.string().trim().min(1, 'Ada pertanyaan yang teksnya masih kosong.').max(500, 'Teks pertanyaan terlalu panjang.'),
  required: z.boolean(),
  roles: z.array(roleEnum).min(1, 'Setiap pertanyaan harus tampil untuk minimal satu peran.'),
  options: z.array(z.string().max(200, 'Opsi jawaban terlalu panjang.')).max(30, 'Maksimal 30 opsi per pertanyaan.'),
  settings: settingsSchema,
});

/** Simpan hanya pengaturan yang relevan untuk jenis pertanyaannya. */
function cleanSettings(q: Question): QSettings {
  const s = q.settings ?? {};
  if (isChoice(q.type)) return s.allow_other ? { allow_other: true, other_label: (s.other_label ?? '').trim() || 'Lainnya, tuliskan' } : {};
  if (q.type === 'range') {
    const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.trunc(n) : null);
    return {
      start_label: (s.start_label ?? '').trim() || 'Mulai',
      end_label: (s.end_label ?? '').trim() || 'sampai',
      min: num(s.min),
      max: num(s.max),
    };
  }
  return {};
}

export async function createForm() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('forms')
    .insert({ slug: generateSlug(), title: 'Judul baru', description: '' })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Gagal membuat angket.');
  await supabase.from('questions').insert({
    form_id: data.id,
    position: 0,
    type: 'radio',
    title: 'Pertanyaan pertama',
    required: true,
    options: ['Opsi 1', 'Opsi 2'],
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
  if (d.access_mode === 'kode' && !d.access_code) return { ok: false, error: 'Isi kode akses untuk mode "Kode angket + nomor induk".' };
  if (d.opens_at && d.closes_at && new Date(d.closes_at) <= new Date(d.opens_at))
    return { ok: false, error: 'Waktu ditutup harus setelah waktu dibuka.' };
  if (d.open_time && d.close_time && d.close_time.slice(0, 5) <= d.open_time.slice(0, 5))
    return { ok: false, error: 'Jam tutup harus setelah jam buka.' };
  if (questions.length === 0) return { ok: false, error: 'Angket butuh minimal satu pertanyaan.' };

  const cleaned = questions.map((q) => ({
    ...q,
    options: isChoice(q.type) ? q.options.map((o) => o.trim()).filter(Boolean) : [],
    settings: cleanSettings(q),
  }));
  const qs = z.array(questionSchema).safeParse(cleaned);
  if (!qs.success) return { ok: false, error: qs.error.issues[0]?.message ?? 'Pertanyaan tidak valid.' };
  const bad = qs.data.findIndex((q) => isChoice(q.type) && q.options.length < 2);
  if (bad >= 0) return { ok: false, error: `Pertanyaan nomor ${bad + 1} butuh minimal 2 opsi jawaban.` };
  const badRange = qs.data.findIndex(
    (q) => q.type === 'range' && typeof q.settings.min === 'number' && typeof q.settings.max === 'number' && q.settings.min > q.settings.max,
  );
  if (badRange >= 0) return { ok: false, error: `Pertanyaan nomor ${badRange + 1}: batas terkecil lebih besar dari batas terbesar.` };

  const { error: fErr } = await supabase
    .from('forms')
    .update({
      ...d,
      access_code: d.access_code ? d.access_code.toUpperCase() : null,
      open_days: Array.from(new Set(d.open_days)).sort(),
    })
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
    settings: q.settings,
  }));
  const { error: uErr } = await supabase.from('questions').upsert(rows, { onConflict: 'id' });
  if (uErr) return { ok: false, error: 'Gagal menyimpan pertanyaan: ' + uErr.message };

  revalidatePath('/admin');
  revalidatePath(`/admin/angket/${id}`);
  return { ok: true, message: 'Perubahan tersimpan.' };
}

/** Hapus SEMUA jawaban angket ini (pertanyaan & link tetap). Link pribadi bisa dipakai lagi. */
export async function clearResponses(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { count } = await supabase.from('responses').select('id', { count: 'exact', head: true }).eq('form_id', id);
  const { error } = await supabase.from('responses').delete().eq('form_id', id);
  if (error) return { ok: false, error: 'Gagal menghapus jawaban: ' + error.message };
  const { error: tErr } = await supabase.from('access_tokens').update({ used_at: null }).eq('form_id', id).not('used_at', 'is', null);
  if (tErr) return { ok: false, error: 'Jawaban terhapus, tetapi status link gagal direset: ' + tErr.message };
  revalidatePath('/admin');
  revalidatePath(`/admin/angket/${id}`);
  revalidatePath(`/admin/angket/${id}/responden`);
  return { ok: true, message: `${count ?? 0} jawaban dihapus. Angket siap diisi dari awal.` };
}
