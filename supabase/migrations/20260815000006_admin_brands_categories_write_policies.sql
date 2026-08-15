-- Admin brands & categories CRUD (Task 3.4). Same `for all` shape as
-- `20260815000004_admin_catalog_write_policies.sql` — see that file's
-- comment for why one `for all` policy covers both admin read-of-drafts and
-- writes without disturbing the existing public "active only" select
-- policies these two tables don't even have (brands/categories have no
-- draft state, they're public read already, so this only adds writes).

create policy "admins can manage brands"
  on public.brands for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can manage categories"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());
