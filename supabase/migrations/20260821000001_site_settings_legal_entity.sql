-- Phase 6 (Task 5): legal entity name + commercial registration number,
-- admin-editable in `/admin/settings` like the rest of `site_settings`.
-- Rendered into `terms-of-service`'s `{{legal_entity_name}}` /
-- `{{registration_number}}` tokens by `/[locale]/p/[slug]` at read time —
-- see `content-pages.ts`'s terms-of-service body for the token source.
-- Nullable, same "empty until admin fills it in" posture as every other
-- column on this table (see 20260818000001_site_settings.sql's comment).

alter table public.site_settings
  add column legal_entity_name_en text,
  add column legal_entity_name_ar text,
  add column registration_number text;
