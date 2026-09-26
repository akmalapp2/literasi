-- =====================================================================
-- 0004 — Identitas pada mode Terbuka
--   'semua' : siswa wajib NIT, guru/kepala sekolah/peran lain wajib NIP/nomor induk (bawaan)
--   'siswa' : hanya siswa wajib NIT, peran lain anonim
--   'none'  : semua anonim
-- Jalankan di SQL Editor Supabase SETELAH 0003.
-- =====================================================================
alter table public.forms
  add column if not exists open_id text not null default 'semua'
  check (open_id in ('none', 'siswa', 'semua'));
