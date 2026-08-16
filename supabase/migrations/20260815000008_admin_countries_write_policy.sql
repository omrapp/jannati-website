-- Admin country settings (Task 3.6). Fulfils the "writes are staff-only and
-- are added with the admin role in Phase 3" comment left in
-- `20260812000001_countries.sql`. Same `for all` shape as
-- `20260815000004_admin_catalog_write_policies.sql` — see that file's
-- comment for why one policy covers both (admin already has select via the
-- existing public "countries are publicly readable" policy, this only adds
-- writes).
create policy "admins can manage countries"
  on public.countries for all
  using (public.is_admin())
  with check (public.is_admin());
