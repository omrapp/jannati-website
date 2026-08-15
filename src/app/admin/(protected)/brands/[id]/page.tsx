import { notFound } from 'next/navigation';

import { getBrand } from '@/lib/admin/taxonomy';
import { createClient } from '@/lib/supabase/server';
import { BrandForm } from '../brand-form';

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createClient();
  const brand = await getBrand(client, id);
  if (!brand) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{brand.name_en}</h1>
      <BrandForm
        initial={{
          id: brand.id,
          slug: brand.slug,
          nameEn: brand.name_en,
          nameAr: brand.name_ar ?? '',
          descriptionAr: brand.description_ar ?? '',
          descriptionEn: brand.description_en ?? '',
          logoPath: brand.logo_path ?? '',
          sortOrder: brand.sort_order,
        }}
      />
    </div>
  );
}
