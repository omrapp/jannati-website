-- Staff role gate for `/admin` (Phase 3). Every catalog/country/coupon write
-- policy left in Phase 1/2 migrations is service-role-only with a comment
-- pointing here (see `countries.sql`, `catalog.sql`) — those policies get
-- rewritten to check `is_admin()` as each Phase 3 task adds admin writes for
-- that table, rather than all at once here.
--
-- No self-service signup: a row is inserted by a developer running SQL
-- (`insert into admin_users ...`) after confirming with the shop who should
-- have staff access, same trust boundary as the service-role key itself.
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- `security definer` so this can be called from RLS policies on *other*
-- tables (Phase 3 tasks 3.2+) without each one re-deriving the check, and so
-- the policy below on `admin_users` itself doesn't recurse into its own RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Any signed-in admin can see the staff list (small, low-sensitivity: just
-- who has access, not their orders or personal data). Row inserts/deletes
-- stay service-role-only — see the no-self-service note above.
create policy "admin users readable by admins"
  on public.admin_users for select
  using (public.is_admin());
