-- Storage for catalog imagery.
--
-- Public bucket: product photos are public data and serving them straight from
-- the Storage CDN keeps them out of the application's request path. Writes stay
-- staff-only — the seed uploader and the admin panel use the service role.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'product-images');
