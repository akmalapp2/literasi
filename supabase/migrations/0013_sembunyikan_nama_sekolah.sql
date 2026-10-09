-- =====================================================================
-- 0013 — Opsi: sembunyikan baris nama sekolah bila sudah tercantum di nama aplikasi
-- Jalankan di SQL Editor Supabase SETELAH 0012.
-- =====================================================================
alter table public.app_settings
  add column if not exists hide_school_dup boolean not null default false;
