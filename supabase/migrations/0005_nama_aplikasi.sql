-- =====================================================================
-- 0005 — Nama aplikasi menjadi "Angket SMKN 3 Kepulauan Selayar"
-- (Bisa juga diubah kapan saja lewat menu Pengaturan di panel admin.)
-- =====================================================================
update public.app_settings
set app_name = 'Angket SMKN 3 Kepulauan Selayar', updated_at = now()
where id = 1;

alter table public.app_settings alter column app_name set default 'Angket SMKN 3 Kepulauan Selayar';
