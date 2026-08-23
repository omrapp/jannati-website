/**
 * Site-wide contact info, social links, and map coordinates (Task 5.1) —
 * one row (`site_settings.id = true`, the singleton-row trick — see the
 * migration). `getSiteSettings` is called from both the storefront
 * (header/footer/home hero/contact page, unauthenticated) and the admin
 * settings form, same "storefront read lives next to the admin write" shape
 * `content-pages.ts` uses for `getPublishedContentPage`.
 *
 * Cookie-bound client throughout, never service-role: the table's RLS
 * (public select, admin-gated all) already says exactly who can do what, so
 * there's nothing a service-role bypass would be needed for — unlike
 * `banners`/`images.ts`, which write to a Storage bucket with no
 * client-writable policy at all.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/types';

export type SiteSettings = Database['public']['Tables']['site_settings']['Row'];

type Client = SupabaseClient<Database>;

/**
 * Always returns a row — the migration seeds the single `id = true` row on
 * creation, so "not configured yet" means every field is `null`, never a
 * missing row. Callers render an empty state per field, not a whole-page
 * fallback.
 */
export async function getSiteSettings(client: Client): Promise<SiteSettings> {
  const { data, error } = await client.from('site_settings').select('*').eq('id', true).single();
  if (error) throw new Error(`reading site settings: ${error.message}`);
  return data;
}

export type SiteSettingsInput = {
  phone: string | null;
  whatsapp: string | null;
  whatsappShow: boolean;
  email: string | null;
  addressAr: string | null;
  addressEn: string | null;
  mapLat: number | null;
  mapLng: number | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  xUrl: string | null;
  youtubeUrl: string | null;
  legalEntityNameEn: string | null;
  legalEntityNameAr: string | null;
  registrationNumber: string | null;
};

export async function updateSiteSettings(client: Client, input: SiteSettingsInput): Promise<void> {
  const { error } = await client
    .from('site_settings')
    .update({
      phone: input.phone,
      whatsapp: input.whatsapp,
      whatsapp_show: input.whatsappShow,
      email: input.email,
      address_ar: input.addressAr,
      address_en: input.addressEn,
      map_lat: input.mapLat,
      map_lng: input.mapLng,
      instagram_url: input.instagramUrl,
      facebook_url: input.facebookUrl,
      tiktok_url: input.tiktokUrl,
      x_url: input.xUrl,
      youtube_url: input.youtubeUrl,
      legal_entity_name_en: input.legalEntityNameEn,
      legal_entity_name_ar: input.legalEntityNameAr,
      registration_number: input.registrationNumber,
    })
    .eq('id', true);
  if (error) throw new Error(`updating site settings: ${error.message}`);
}
