-- Contact page redesign: the form gains an optional "how can we help?"
-- topic select (general / order / product / wholesale / feedback / other).
-- Stored as free text rather than a Postgres enum — the option list lives
-- in the storefront's i18n messages, not the schema, so adding a topic
-- later doesn't need a migration.
alter table public.contact_messages
  add column service text;
