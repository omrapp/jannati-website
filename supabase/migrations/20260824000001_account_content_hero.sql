-- Account page rebuild + content-page hero images.
--
-- `customers.full_name`: the account page needs an editable display name,
-- but `public.customers` only ever carried `phone`/`default_locale`/
-- `marketing_opt_in` — a shopper's name previously only existed per-address
-- (`addresses.full_name`). Nullable, same "empty until the shopper fills it
-- in" posture as every other optional profile field on this table; the
-- existing "a customer can update their own row" policy
-- (`id = auth.uid()`, `20260813000002_commerce.sql`) already covers writing
-- it, no new policy needed.
--
-- `content_pages.hero_image_url`: a plain admin-editable URL, not a Storage
-- upload — same posture as `banners.link`, free text with no bucket/policy
-- of its own. Nullable; `/[locale]/p/[slug]` renders no hero section when
-- unset, same "empty state per field" contract `getSiteSettings` already
-- documents. Seeded here for the four pages this task actually redesigns
-- (about-us, faqs, shipping-policy, returns) with curated Pexels photos;
-- terms-of-service/privacy-policy are left unset on purpose — legal pages
-- don't need a hero.

alter table public.customers
  add column full_name text;

alter table public.content_pages
  add column hero_image_url text;

update public.content_pages set hero_image_url =
  case slug
    when 'about-us' then 'https://images.pexels.com/photos/4938515/pexels-photo-4938515.jpeg?auto=compress&cs=tinysrgb&w=1920'
    when 'faqs' then 'https://images.pexels.com/photos/8866777/pexels-photo-8866777.jpeg?auto=compress&cs=tinysrgb&w=1920'
    when 'shipping-policy' then 'https://images.pexels.com/photos/4440801/pexels-photo-4440801.jpeg?auto=compress&cs=tinysrgb&w=1920'
    when 'returns' then 'https://images.pexels.com/photos/6969911/pexels-photo-6969911.jpeg?auto=compress&cs=tinysrgb&w=1920'
    else hero_image_url
  end
where slug in ('about-us', 'faqs', 'shipping-policy', 'returns');
