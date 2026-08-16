-- Task 4.1: reviews submission form needs one review per customer per
-- product (upsert, not always-insert) and a way for a customer to edit
-- their own review — 3.9's migration only ever expected admin writes past
-- the initial insert, so neither existed yet.

-- Backs the `upsert(..., { onConflict: 'customer_id,product_id' })` call in
-- `src/lib/commerce/reviews.ts`. Re-submitting edits the existing row rather
-- than creating a second one.
alter table public.reviews
  add constraint reviews_customer_id_product_id_key unique (customer_id, product_id);

-- Editing a review re-moderates it: the `with check` forces the resulting
-- row back to `pending` even if it started `approved`, same "never
-- self-approved" rule 3.9's insert policy already enforces.
create policy "customers can update their own reviews"
  on public.reviews for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid() and status = 'pending');
