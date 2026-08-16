import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { listBanners } from '@/lib/admin/banners';
import { createAdminClient } from '@/lib/supabase/admin';
import { BannersList } from './banners-list';

export default async function AdminBannersPage() {
  const admin = createAdminClient();
  const banners = await listBanners(admin);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Banners ({banners.length})</h1>
        <Button asChild>
          <Link href="/admin/banners/new">New banner</Link>
        </Button>
      </div>

      <BannersList
        banners={banners.map((b) => ({
          id: b.id,
          imagePath: b.image_path,
          titleAr: b.title_ar,
          titleEn: b.title_en,
          active: b.active,
        }))}
      />

      {banners.length === 0 && <p className="text-muted-foreground text-sm">No banners yet.</p>}
    </div>
  );
}
