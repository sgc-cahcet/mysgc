-- Optimized helper functions and RLS policies for the MySGC schema.
-- Review in Supabase SQL editor before applying in production.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create or replace function public.current_member_id()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.members as m
  where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

create or replace function public.current_member_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.members as m
  where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

create or replace function public.is_admin_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_member_role() in ('President', 'Vice President', 'Administrator', 'Session Incharge'),
    false
  )
$$;

create or replace function public.check_member_registration_status(p_email text)
returns table (
  member_exists boolean,
  is_registered boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    true as member_exists,
    coalesce(m.is_registered, false) as is_registered
  from public.members as m
  where lower(m.email) = lower(trim(p_email))
  limit 1
$$;

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

create or replace function public.get_member_attendance_summary(p_member_id integer)
returns table (
  month_key text,
  display_month text,
  total_working_days integer,
  present_days integer,
  absent_dates date[],
  percentage numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with working_days as (
    select distinct a.date
    from public.attendance as a
  ),
  member_presence as (
    select a.date
    from public.attendance as a
    where a.member_id = p_member_id
      and a.is_present = true
  ),
  monthly_base as (
    select
      to_char(w.date, 'YYYY-MM') as month_key,
      date_trunc('month', w.date)::date as month_start,
      w.date,
      exists (
        select 1
        from member_presence as mp
        where mp.date = w.date
      ) as was_present
    from working_days as w
  )
  select
    mb.month_key,
    trim(to_char(mb.month_start, 'Month YYYY')) as display_month,
    count(*)::integer as total_working_days,
    count(*) filter (where mb.was_present)::integer as present_days,
    coalesce(array_agg(mb.date order by mb.date) filter (where not mb.was_present), '{}') as absent_dates,
    round(
      (count(*) filter (where mb.was_present)::numeric / nullif(count(*), 0)) * 100,
      1
    ) as percentage
  from monthly_base as mb
  group by mb.month_key, mb.month_start
  order by mb.month_key desc
$$;

create or replace function public.get_session_feedback_summary()
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

alter table public.session_interests
  add column if not exists handler_count integer not null default 1,
  add column if not exists co_handler_id integer,
  add column if not exists co_handler_name text;

alter table public.sessions
  add column if not exists handler_count integer not null default 1,
  add column if not exists co_handler_id integer,
  add column if not exists co_handler text;

create index if not exists attendance_member_date_idx on public.attendance (member_id, date);
create index if not exists attendance_date_idx on public.attendance (date);
create index if not exists sessions_handler_date_idx on public.sessions (handler_id, date desc);
create index if not exists sessions_co_handler_date_idx on public.sessions (co_handler_id, date desc);
create index if not exists sessions_lookup_idx on public.sessions (title, handler, date);
create index if not exists session_feedback_session_created_idx on public.session_feedback (session_id, created_at desc);
create index if not exists session_feedback_member_date_idx on public.session_feedback (member_id, date desc);
create index if not exists session_interests_member_created_idx on public.session_interests (member_id, created_at desc);
create index if not exists notifications_member_created_idx on public.notifications (member_id, created_at desc);
create index if not exists push_subscriptions_member_idx on public.push_subscriptions (member_id);
create index if not exists feedback_status_created_idx on public.feedback (status, created_at desc);

grant execute on function public.check_member_registration_status(text) to anon, authenticated;
grant execute on function public.get_member_attendance_summary(integer) to authenticated;
grant execute on function public.list_session_handler_members() to authenticated;

alter table public.members enable row level security;
alter table public.attendance enable row level security;
alter table public.feedback enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.session_feedback enable row level security;
alter table public.session_interests enable row level security;
alter table public.sessions enable row level security;

drop policy if exists "members_select_self_or_admin" on public.members;
create policy "members_select_self_or_admin"
on public.members
for select
to authenticated
using (
  id = public.current_member_id()
  or public.is_admin_member()
);

drop policy if exists "attendance_select_self_or_admin" on public.attendance;
create policy "attendance_select_self_or_admin"
on public.attendance
for select
to authenticated
using (
  member_id = public.current_member_id()
  or public.is_admin_member()
);

drop policy if exists "attendance_admin_write" on public.attendance;
create policy "attendance_admin_write"
on public.attendance
for all
to authenticated
using (public.is_admin_member())
with check (public.is_admin_member());

drop policy if exists "feedback_admin_read" on public.feedback;
create policy "feedback_admin_read"
on public.feedback
for select
to authenticated
using (public.is_admin_member());

drop policy if exists "feedback_insert_authenticated" on public.feedback;
create policy "feedback_insert_authenticated"
on public.feedback
for insert
to authenticated
with check (true);

drop policy if exists "feedback_admin_update" on public.feedback;
create policy "feedback_admin_update"
on public.feedback
for update
to authenticated
using (public.is_admin_member())
with check (public.is_admin_member());

drop policy if exists "notifications_select_self_or_admin" on public.notifications;
create policy "notifications_select_self_or_admin"
on public.notifications
for select
to authenticated
using (
  member_id = public.current_member_id()
  or public.is_admin_member()
);

drop policy if exists "notifications_self_update_or_admin" on public.notifications;
create policy "notifications_self_update_or_admin"
on public.notifications
for update
to authenticated
using (
  member_id = public.current_member_id()
  or public.is_admin_member()
)
with check (
  member_id = public.current_member_id()
  or public.is_admin_member()
);

drop policy if exists "notifications_admin_insert" on public.notifications;
create policy "notifications_admin_insert"
on public.notifications
for insert
to authenticated
with check (public.is_admin_member());

drop policy if exists "push_subscriptions_self_or_admin_select" on public.push_subscriptions;
create policy "push_subscriptions_self_or_admin_select"
on public.push_subscriptions
for select
to authenticated
using (
  member_id = public.current_member_id()
  or public.is_admin_member()
);

drop policy if exists "push_subscriptions_self_insert_or_admin" on public.push_subscriptions;
create policy "push_subscriptions_self_insert_or_admin"
on public.push_subscriptions
for insert
to authenticated
with check (
  member_id = public.current_member_id()
  or public.is_admin_member()
);

drop policy if exists "push_subscriptions_self_delete_or_admin" on public.push_subscriptions;
create policy "push_subscriptions_self_delete_or_admin"
on public.push_subscriptions
for delete
to authenticated
using (
  member_id = public.current_member_id()
  or public.is_admin_member()
);

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

drop policy if exists "session_feedback_insert_self" on public.session_feedback;
create policy "session_feedback_insert_self"
on public.session_feedback
for insert
to authenticated
with check (
  member_id = public.current_member_id()
  or public.is_admin_member()
);

drop policy if exists "session_feedback_admin_delete" on public.session_feedback;
create policy "session_feedback_admin_delete"
on public.session_feedback
for delete
to authenticated
using (public.is_admin_member());

drop policy if exists "session_interests_select_self_or_admin" on public.session_interests;
create policy "session_interests_select_self_or_admin"
on public.session_interests
for select
to authenticated
using (
  member_id = public.current_member_id()
  or public.is_admin_member()
);

drop policy if exists "session_interests_insert_self" on public.session_interests;
create policy "session_interests_insert_self"
on public.session_interests
for insert
to authenticated
with check (
  member_id = public.current_member_id()
  or public.is_admin_member()
);

drop policy if exists "session_interests_admin_update" on public.session_interests;
create policy "session_interests_admin_update"
on public.session_interests
for update
to authenticated
using (public.is_admin_member())
with check (public.is_admin_member());

drop policy if exists "session_interests_admin_delete" on public.session_interests;
create policy "session_interests_admin_delete"
on public.session_interests
for delete
to authenticated
using (public.is_admin_member());

drop policy if exists "sessions_select_authenticated" on public.sessions;
create policy "sessions_select_authenticated"
on public.sessions
for select
to authenticated
using (true);

drop policy if exists "sessions_admin_write" on public.sessions;
create policy "sessions_admin_write"
on public.sessions
for all
to authenticated
using (public.is_admin_member())
with check (public.is_admin_member());
