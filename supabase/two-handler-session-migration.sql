-- Incremental migration for two-handler sessions.
-- Run this in Supabase SQL editor once before deploying the app changes.

alter table public.session_interests
  add column if not exists handler_count integer not null default 1,
  add column if not exists co_handler_id integer,
  add column if not exists co_handler_name text;

alter table public.sessions
  add column if not exists handler_count integer not null default 1,
  add column if not exists co_handler_id integer,
  add column if not exists co_handler text;

create index if not exists sessions_co_handler_date_idx
  on public.sessions (co_handler_id, date desc);

create or replace function public.list_session_handler_members()
returns table (
  id integer,
  name text
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.name
  from public.members as m
  order by m.name asc
$$;

grant execute on function public.list_session_handler_members() to authenticated;

drop function if exists public.get_session_feedback_summary();

create function public.get_session_feedback_summary()
returns table (
  session_id uuid,
  session_title text,
  session_date date,
  handler text,
  handler_id integer,
  co_handler text,
  co_handler_id integer,
  feedback_count bigint,
  average_rating numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id as session_id,
    s.title as session_title,
    s.date as session_date,
    s.handler,
    s.handler_id,
    s.co_handler,
    s.co_handler_id,
    count(sf.id) as feedback_count,
    round(avg(sf.rating)::numeric, 1) as average_rating
  from public.sessions as s
  left join public.session_feedback as sf
    on sf.session_id = s.id
  where s.is_approved = true
  group by s.id, s.title, s.date, s.handler, s.handler_id, s.co_handler, s.co_handler_id
  order by s.date desc, s.title asc
$$;

drop policy if exists "session_feedback_select_related_or_admin" on public.session_feedback;

create policy "session_feedback_select_related_or_admin"
on public.session_feedback
for select
to authenticated
using (
  member_id = public.current_member_id()
  or public.is_admin_member()
  or exists (
    select 1
    from public.sessions as s
    where s.id = session_feedback.session_id
      and (
        s.handler_id = public.current_member_id()
        or s.co_handler_id = public.current_member_id()
      )
  )
);
