-- =====================================================================
-- 0008 — Pengisian berulang
--   repeat_mode di forms:
--     'sekali'   : satu orang hanya sekali selamanya (bawaan, seperti sebelumnya)
--     'mingguan' : satu orang sekali per minggu (Senin–Minggu, WITA)
--     'harian'   : satu orang sekali per hari (WITA)
--   period_key di responses mencatat periode tiap jawaban, sehingga riwayat
--   minggu-minggu sebelumnya tetap tersimpan.
-- Jalankan di SQL Editor Supabase SETELAH 0007.
-- =====================================================================

alter table public.forms
  add column if not exists repeat_mode text not null default 'sekali'
  check (repeat_mode in ('sekali', 'mingguan', 'harian'));

alter table public.responses
  add column if not exists period_key text not null default 'sekali';

-- Kunci periode (zona WITA). Minggu dimulai hari Senin.
create or replace function public.period_key(p_mode text, p_at timestamptz)
returns text
language sql stable
set search_path = ''
as $$
  select case p_mode
    when 'mingguan' then 'W' || to_char(date_trunc('week', p_at at time zone 'Asia/Makassar'), 'YYYY-MM-DD')
    when 'harian'   then 'D' || to_char(p_at at time zone 'Asia/Makassar', 'YYYY-MM-DD')
    else 'sekali'
  end;
$$;

-- Satu jawaban per orang/perangkat PER PERIODE (bukan selamanya lagi).
drop index if exists public.responses_once_per_respondent;
drop index if exists public.responses_once_per_device;
create unique index if not exists responses_once_per_respondent_period
  on public.responses (form_id, respondent_id, period_key) where respondent_id is not null;
create unique index if not exists responses_once_per_device_period
  on public.responses (form_id, device_id, period_key) where device_id is not null;
create index if not exists responses_period_idx on public.responses (form_id, period_key);

create or replace function public.submit_response(
  p_form_id uuid,
  p_token text,
  p_device_id text,
  p_role public.peran,
  p_answers jsonb
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_form public.forms;
  v_tok public.access_tokens;
  v_resp public.respondents;
  v_response_id uuid;
  v_rid uuid;
  v_role public.peran := p_role;
  v_class text;
  v_local timestamp := now() at time zone 'Asia/Makassar';
  v_period text;
begin
  select * into v_form from public.forms where id = p_form_id;
  if not found then raise exception 'ANGKET_TIDAK_ADA'; end if;
  if v_form.status <> 'terbit' then raise exception 'ANGKET_TIDAK_DIBUKA'; end if;
  if v_form.opens_at is not null and now() < v_form.opens_at then raise exception 'ANGKET_BELUM_DIBUKA'; end if;
  if v_form.closes_at is not null and now() > v_form.closes_at then raise exception 'ANGKET_SUDAH_DITUTUP'; end if;
  -- Jadwal mingguan (WITA). Toleransi 15 menit setelah jam tutup agar yang sedang mengisi tetap bisa mengirim.
  if coalesce(array_length(v_form.open_days, 1), 0) > 0
     and not (extract(dow from v_local)::int = any(v_form.open_days)) then
    raise exception 'ANGKET_BUKAN_HARINYA';
  end if;
  if v_form.open_time is not null and v_local::time < v_form.open_time then raise exception 'ANGKET_BELUM_JAMNYA'; end if;
  if v_form.close_time is not null and v_local::time > v_form.close_time + interval '15 minutes' then raise exception 'ANGKET_LEWAT_JAMNYA'; end if;

  v_period := public.period_key(v_form.repeat_mode, now());

  if p_token is not null then
    select * into v_tok from public.access_tokens
      where token = p_token and form_id = p_form_id
      for update;
    if not found then raise exception 'TOKEN_TIDAK_VALID'; end if;
    -- Sudah mengisi pada periode ini (sekali / hari ini / minggu ini)?
    if v_tok.used_at is not null and public.period_key(v_form.repeat_mode, v_tok.used_at) = v_period then
      raise exception 'TOKEN_SUDAH_DIPAKAI';
    end if;
    select * into v_resp from public.respondents where id = v_tok.respondent_id;
    v_rid := v_resp.id;
    v_role := v_resp.role;
    v_class := v_resp.class_name;
    update public.access_tokens set used_at = now() where id = v_tok.id;
  elsif v_form.access_mode <> 'terbuka' then
    raise exception 'TOKEN_DIPERLUKAN';
  end if;

  insert into public.responses (form_id, respondent_id, role, class_name, device_id, period_key)
  values (p_form_id, v_rid, v_role, v_class, case when p_token is null then p_device_id end, v_period)
  returning id into v_response_id;

  insert into public.answers (response_id, question_id, value_text, value_list)
  select v_response_id, q.id,
         case when jsonb_typeof(a.value) = 'string' then a.value #>> '{}' end,
         case when jsonb_typeof(a.value) = 'array'
              then array(select jsonb_array_elements_text(a.value)) end
  from jsonb_each(p_answers) as a
  join public.questions q on q.id::text = a.key and q.form_id = p_form_id;

  return v_response_id;
end $$;

revoke all on function public.submit_response(uuid, text, text, public.peran, jsonb) from public, anon, authenticated;
grant execute on function public.submit_response(uuid, text, text, public.peran, jsonb) to service_role;
