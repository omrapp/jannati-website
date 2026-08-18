-- Phase 5 (Task 5.3): public contact/feedback form submissions. A
-- submitter's row and an admin's row are different actors with different
-- rights — unlike every other admin-authored table so far (`banners`,
-- `content_pages`), the *public* is the writer here and the admin is the
-- reader, so the RLS shape flips: anon gets insert-only, admin gets
-- everything, and nobody but an admin can ever select a row back.

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  phone text,
  message text not null check (char_length(message) between 1 and 5000),
  is_read boolean not null default false,

  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Insert-only for anon: a shopper can submit a message but can never read
-- one back, including their own — same "write without read" shape as an
-- honesty box, not a two-way inbox.
create policy "anyone can submit a contact message"
  on public.contact_messages for insert
  with check (true);

create policy "admins can manage contact messages"
  on public.contact_messages for all
  using (public.is_admin())
  with check (public.is_admin());
