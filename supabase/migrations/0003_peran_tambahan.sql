-- =====================================================================
-- 0003 — Peran responden tambahan agar aplikasi bisa dipakai untuk
-- angket umum: tenaga kependidikan, orang tua/wali, alumni, masyarakat umum.
-- Jalankan di SQL Editor Supabase SETELAH 0002.
-- =====================================================================

alter type public.peran add value if not exists 'tendik';
alter type public.peran add value if not exists 'ortu';
alter type public.peran add value if not exists 'alumni';
alter type public.peran add value if not exists 'umum';
