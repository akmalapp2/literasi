-- =====================================================================
-- Gerakan Literasi Sekolah — SMKN 3 Kepulauan Selayar
-- Skema database Supabase. Jalankan sekali di SQL Editor Supabase
-- (atau lewat `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tipe ----------
do $$ begin
  create type public.peran as enum ('kepsek', 'guru', 'siswa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.jenis_pertanyaan as enum ('short', 'long', 'radio', 'checkbox', 'dropdown');
exception when duplicate_object then null; end $$;

-- ---------- Admin (satu-satunya peran akun) ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- ---------- Pengaturan aplikasi (satu baris) ----------
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  app_name text not null default 'Gerakan Literasi Sekolah',
  school_name text not null default 'SMKN 3 Kepulauan Selayar',
  logo_url text,
  default_fill_design text not null default 'A' check (default_fill_design in ('A', 'B')),
  editor_view text not null default 'panel' check (editor_view in ('kartu', 'panel')),
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict do nothing;

-- ---------- Angket ----------
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  title text not null,
  description text not null default '',
  targets public.peran[] not null default '{kepsek,guru,siswa}',
  status text not null default 'draf' check (status in ('draf', 'terbit', 'ditutup')),
  access_mode text not null default 'token' check (access_mode in ('token', 'kode', 'terbuka')),
  access_code text,
  fill_design text not null default 'ikut' check (fill_design in ('ikut', 'A', 'B')),
  opens_at timestamptz,
  closes_at timestamptz,
  public_results boolean not null default true,
  hide_text_public boolean not null default true,
  results_after_close boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Pertanyaan ----------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  position int not null default 0,
  type public.jenis_pertanyaan not null,
  title text not null,
  required boolean not null default false,
  roles public.peran[] not null default '{kepsek,guru,siswa}',
  options text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists questions_form_idx on public.questions (form_id, position);

-- ---------- Responden (kepala sekolah, guru, siswa) ----------
create table if not exists public.respondents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  identifier text not null unique,      -- NISN (siswa) atau NIP/NUPTK (guru, kepala sekolah)
  role public.peran not null,
  class_name text,                      -- kelas, untuk siswa
  subject text,                         -- mapel/jabatan, untuk guru
  phone text,                           -- nomor WhatsApp (opsional)
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists respondents_role_idx on public.respondents (role, class_name);

-- ---------- Link/token pribadi per angket ----------
create table if not exists public.access_tokens (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  respondent_id uuid not null references public.respondents (id) on delete cascade,
  token text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (form_id, respondent_id)
);

-- ---------- Jawaban ----------
create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  respondent_id uuid references public.respondents (id) on delete set null,
  role public.peran,
  class_name text,
  device_id text,
  submitted_at timestamptz not null default now()
);
create unique index if not exists responses_once_per_respondent
  on public.responses (form_id, respondent_id) where respondent_id is not null;
create unique index if not exists responses_once_per_device
  on public.responses (form_id, device_id) where device_id is not null;
create index if not exists responses_form_idx on public.responses (form_id, role);

create table if not exists public.answers (
  id bigint generated always as identity primary key,
  response_id uuid not null references public.responses (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  value_text text,
  value_list text[]
);
create index if not exists answers_question_idx on public.answers (question_id);
create index if not exists answers_response_idx on public.answers (response_id);

-- ---------- updated_at otomatis ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists forms_touch on public.forms;
create trigger forms_touch before update on public.forms
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- Row Level Security
-- Admin (login) mengelola semuanya lewat RLS.
-- Responden & publik TIDAK punya akses langsung; semua lewat server
-- Next.js memakai secret key + fungsi di bawah.
-- =====================================================================
alter table public.admins        enable row level security;
alter table public.app_settings  enable row level security;
alter table public.forms         enable row level security;
alter table public.questions     enable row level security;
alter table public.respondents   enable row level security;
alter table public.access_tokens enable row level security;
alter table public.responses     enable row level security;
alter table public.answers       enable row level security;

drop policy if exists "admin lihat diri" on public.admins;
create policy "admin lihat diri" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "semua baca pengaturan" on public.app_settings;
create policy "semua baca pengaturan" on public.app_settings
  for select to anon, authenticated using (true);
drop policy if exists "admin ubah pengaturan" on public.app_settings;
create policy "admin ubah pengaturan" on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['forms','questions','respondents','access_tokens','responses','answers'] loop
    execute format('drop policy if exists "admin kelola" on public.%I', t);
    execute format('create policy "admin kelola" on public.%I for all to authenticated
                    using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

grant execute on function public.is_admin() to authenticated;

-- Hak akses dasar (tetap dibatasi oleh RLS di atas)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant select on public.app_settings to anon;

-- =====================================================================
-- Simpan jawaban secara atomik (token ditandai terpakai + jawaban masuk
-- dalam satu transaksi). Hanya bisa dipanggil server (service role).
-- =====================================================================
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
begin
  select * into v_form from public.forms where id = p_form_id;
  if not found then raise exception 'ANGKET_TIDAK_ADA'; end if;
  if v_form.status <> 'terbit' then raise exception 'ANGKET_TIDAK_DIBUKA'; end if;
  if v_form.opens_at is not null and now() < v_form.opens_at then raise exception 'ANGKET_BELUM_DIBUKA'; end if;
  if v_form.closes_at is not null and now() > v_form.closes_at then raise exception 'ANGKET_SUDAH_DITUTUP'; end if;

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

-- =====================================================================
-- Rekap hasil (agregat, tanpa nama). Hanya server (service role).
-- =====================================================================
create or replace function public.form_results(
  p_form_id uuid,
  p_role public.peran default null,
  p_class text default null
) returns jsonb
language sql stable security definer
set search_path = ''
as $$
  with resp as (
    select r.id, r.submitted_at from public.responses r
    where r.form_id = p_form_id
      and (p_role is null or r.role = p_role)
      and (p_class is null or r.class_name = p_class)
  ),
  q as (select * from public.questions where form_id = p_form_id),
  vals as (
    select a.question_id, q.type, a.response_id, resp.submitted_at, v
    from public.answers a
    join resp on resp.id = a.response_id
    join q on q.id = a.question_id
    cross join lateral unnest(coalesce(a.value_list, array[a.value_text])) as v
    where coalesce(trim(v), '') <> ''
  ),
  counts as (
    select question_id,
           case when type = 'short' then initcap(lower(trim(v))) else v end as label,
           count(*)::int as n
    from vals where type <> 'long'
    group by 1, 2
  ),
  answered as (
    select question_id, count(distinct response_id)::int as n from vals group by 1
  ),
  latest as (
    select question_id, jsonb_agg(v order by submitted_at desc) as items
    from (
      select question_id, v, submitted_at,
             row_number() over (partition by question_id order by submitted_at desc) as rn
      from vals where type = 'long'
    ) x
    where rn <= 8
    group by 1
  )
  select jsonb_build_object(
    'total', (select count(*) from resp),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'type', q.type, 'title', q.title, 'roles', q.roles, 'options', q.options,
        'answered', coalesce((select n from answered where answered.question_id = q.id), 0),
        'counts', coalesce((select jsonb_agg(jsonb_build_object('label', c.label, 'n', c.n) order by c.n desc)
                            from counts c where c.question_id = q.id), '[]'::jsonb),
        'latest', coalesce((select items from latest where latest.question_id = q.id), '[]'::jsonb)
      ) order by q.position)
      from q
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.form_results(uuid, public.peran, text) from public, anon, authenticated;
grant execute on function public.form_results(uuid, public.peran, text) to service_role;

-- =====================================================================
-- Penyimpanan logo (bucket publik)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;
