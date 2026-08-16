import { notFound } from 'next/navigation';

import { getBanner } from '@/lib/admin/banners';
import { createAdminClient } from '@/lib/supabase/admin';
import { BannerForm } from '../banner-form';
import { DeleteBannerButton } from '../delete-banner-button';

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const banner = await getBanner(admin, id);
  if (!banner) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit banner</h1>
        <DeleteBannerButton bannerId={banner.id} />
      </div>
      <BannerForm
        initial={{
          id: banner.id,
          imagePath: banner.image_path,
          link: banner.link ?? '',
          titleAr: banner.title_ar ?? '',
          titleEn: banner.title_en ?? '',
          sortOrder: banner.sort_order,
          active: banner.active,
        }}
      />
    </div>
  );
}
