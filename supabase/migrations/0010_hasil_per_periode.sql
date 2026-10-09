-- =====================================================================
-- 0010 — Rekap hasil per periode (minggu/hari) untuk halaman hasil publik.
-- Menambah parameter p_from/p_to ke form_results.
-- Jalankan di SQL Editor Supabase SETELAH 0009.
-- =====================================================================

drop function if exists public.form_results(uuid, public.peran, text);

create or replace function public.form_results(
  p_form_id uuid,
  p_role public.peran default null,
  p_class text default null,
  p_from timestamptz default null,
  p_to timestamptz default null
) returns jsonb
language sql stable security definer
set search_path = ''
as $$
  with resp as (
    select r.id, r.submitted_at from public.responses r
    where r.form_id = p_form_id
      and (p_role is null or r.role = p_role)
      and (p_class is null or r.class_name = p_class)
      and (p_from is null or r.submitted_at >= p_from)
      and (p_to is null or r.submitted_at < p_to)
  ),
  q as (select * from public.questions where form_id = p_form_id),
  vals as (
    select a.question_id, q.type::text as type, q.options, a.response_id, resp.submitted_at, v
    from public.answers a
    join resp on resp.id = a.response_id
    join q on q.id = a.question_id
    cross join lateral unnest(coalesce(a.value_list, array[a.value_text])) as v
    where coalesce(trim(v), '') <> ''
  ),
  counts as (
    select question_id,
           case when type = 'short' or (type in ('radio', 'checkbox', 'dropdown') and not (v = any(options)))
                then initcap(lower(trim(v))) else v end as label,
           count(*)::int as n
    from vals where type not in ('long', 'range')
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
  ),
  rng as (
    select a.question_id,
           count(*)::int as n,
           round(avg(a.value_list[2]::numeric - a.value_list[1]::numeric + 1), 1) as avg_span,
           sum(a.value_list[2]::numeric - a.value_list[1]::numeric + 1) as total_span,
           min(a.value_list[1]::numeric) as min_start,
           max(a.value_list[2]::numeric) as max_end
    from public.answers a
    join resp on resp.id = a.response_id
    join q on q.id = a.question_id and q.type::text = 'range'
    where array_length(a.value_list, 1) = 2
      and a.value_list[1] ~ '^-?[0-9]+$' and a.value_list[2] ~ '^-?[0-9]+$'
    group by 1
  )
  select jsonb_build_object(
    'total', (select count(*) from resp),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'type', q.type, 'title', q.title, 'roles', q.roles, 'options', q.options,
        'settings', q.settings,
        'answered', coalesce((select n from answered where answered.question_id = q.id), 0),
        'counts', coalesce((select jsonb_agg(jsonb_build_object('label', c.label, 'n', c.n) order by c.n desc)
                            from counts c where c.question_id = q.id), '[]'::jsonb),
        'latest', coalesce((select items from latest where latest.question_id = q.id), '[]'::jsonb),
        'range', (select jsonb_build_object('n', r.n, 'avg_span', r.avg_span, 'total_span', r.total_span,
                                            'min_start', r.min_start, 'max_end', r.max_end)
                  from rng r where r.question_id = q.id)
      ) order by q.position)
      from q
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.form_results(uuid, public.peran, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.form_results(uuid, public.peran, text, timestamptz, timestamptz) to service_role;
