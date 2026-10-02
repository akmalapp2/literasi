-- =====================================================================
-- 0007 — Teks pembuat aplikasi (footer) bisa diubah di menu Pengaturan.
-- Jalankan di SQL Editor Supabase SETELAH 0006.
-- =====================================================================
alter table public.app_settings
  add column if not exists creator text not null default 'Akmal Iskandar, S.Pi';
