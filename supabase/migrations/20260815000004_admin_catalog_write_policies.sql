-- Admin product CRUD (Task 3.2). Fulfils the "writes arrive with admin_users
-- in Phase 3" comment left in `20260812000002_catalog.sql`, for the three
-- tables that task actually touches: products, their variants, and category
-- membership. Brands, categories, and images get their own admin write
-- policies in 3.4/3.3 — scoped narrowly here rather than opening every
-- catalog table at once, so each task's migration matches what it actually
-- exercises.
--
-- One `for all` policy per table, not a separate `select` + write pair:
-- `for all` already covers select, so it both lets admins read drafts
-- (the storefront's existing "active only" select policy still applies too
-- — RLS OR's multiple policies for the same command, so that one doesn't
-- need to know admin exists) and grants insert/update/delete.

create policy "admins can manage products"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can manage variants"
  on public.product_variants for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can manage category memberships"
  on public.product_categories for all
  using (public.is_admin())
  with check (public.is_admin());
