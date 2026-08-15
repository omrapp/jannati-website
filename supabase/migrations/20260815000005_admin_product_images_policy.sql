-- Admin product image management (Task 3.3). Read-only policy, not a write
-- one: `storage_buckets.sql`'s own comment already settled writes for this
-- table's Storage-backed sibling ("the seed uploader and the admin panel use
-- the service role"), and `src/lib/admin/images.ts` follows that — the
-- service-role client writes both the Storage object and this row together,
-- gated by an explicit `checkAdminAccess()` in the server action rather than
-- RLS. This policy exists only so the cookie-bound client the *edit page*
-- reads with can see a draft product's images at all — the existing "images
-- of active products are publicly readable" policy hides them otherwise.
create policy "admins can read all product images"
  on public.product_images for select
  using (public.is_admin());
