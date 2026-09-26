-- =====================================================================
-- 0006 — Jadwal mingguan: angket hanya dibuka pada hari/jam tertentu
--   open_days  : hari buka, 0=Minggu 1=Senin ... 5=Jumat 6=Sabtu (kosong = setiap hari)
--   open_time  : jam mulai (WITA), opsional
--   close_time : jam selesai (WITA), opsional
-- Jalankan di SQL Editor Supabase SETELAH 0005.
-- =====================================================================
alter table public.forms add column if not exists open_days smallint[] not null default '{}';
alter table public.forms add column if not exists open_time time;
alter table public.forms add column if not exists close_time time;

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

  if p_token is not null then
    select * into v_tok from public.access_tokens
      where token = p_token and form_id = p_form_id
      for update;
    if not found then raise exception 'TOKEN_TIDAK_VALID'; end if;
    if v_tok.used_at is not null then raise exception 'TOKEN_SUDAH_DIPAKAI'; end if;
    select * into v_resp from public.respondents where id = v_tok.respondent_id;
    v_rid := v_resp.id;
    v_role := v_resp.role;
    v_class := v_resp.class_name;
    update public.access_tokens set used_at = now() where id = v_tok.id;
  elsif v_form.access_mode <> 'terbuka' then
    raise exception 'TOKEN_DIPERLUKAN';
  end if;

  insert into public.responses (form_id, respondent_id, role, class_name, device_id)
  values (p_form_id, v_rid, v_role, v_class, case when p_token is null then p_device_id end)
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
