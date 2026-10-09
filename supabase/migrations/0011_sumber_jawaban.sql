-- =====================================================================
-- 0011 — Penanda sumber jawaban
--   'responden' : diisi sendiri lewat aplikasi (bawaan)
--   'admin'     : diinput admin (isi susulan)
-- Jalankan di SQL Editor Supabase SETELAH 0010.
-- =====================================================================
alter table public.responses
  add column if not exists source text not null default 'responden'
  check (source in ('responden', 'admin'));

create index if not exists responses_respondent_idx on public.responses (form_id, respondent_id, submitted_at);
