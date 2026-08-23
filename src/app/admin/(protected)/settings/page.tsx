import { getSiteSettings } from '@/lib/admin/site-settings';
import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from './settings-form';

export default async function AdminSettingsPage() {
  const client = await createClient();
  const settings = await getSiteSettings(client);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Store settings</h1>
        <p className="text-muted-foreground text-sm">
          Contact info, social links, and map location shown on the storefront header, footer, and
          contact page.
        </p>
      </div>
      <SettingsForm
        initial={{
          phone: settings.phone ?? '',
          whatsapp: settings.whatsapp ?? '',
          whatsappShow: settings.whatsapp_show,
          email: settings.email ?? '',
          addressAr: settings.address_ar ?? '',
          addressEn: settings.address_en ?? '',
          mapLat: settings.map_lat !== null ? String(settings.map_lat) : '',
          mapLng: settings.map_lng !== null ? String(settings.map_lng) : '',
          instagramUrl: settings.instagram_url ?? '',
          facebookUrl: settings.facebook_url ?? '',
          tiktokUrl: settings.tiktok_url ?? '',
          xUrl: settings.x_url ?? '',
          youtubeUrl: settings.youtube_url ?? '',
          legalEntityNameEn: settings.legal_entity_name_en ?? '',
          legalEntityNameAr: settings.legal_entity_name_ar ?? '',
          registrationNumber: settings.registration_number ?? '',
        }}
      />
    </div>
  );
}
