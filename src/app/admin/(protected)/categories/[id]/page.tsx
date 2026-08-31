import { notFound } from 'next/navigation';

import { getCategory, listCategories } from '@/lib/admin/taxonomy';
import { createClient } from '@/lib/supabase/server';
import { CategoryForm } from '../category-form';

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createClient();
  const [category, categories] = await Promise.all([getCategory(client, id), listCategories(client)]);
  if (!category) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{category.name_en ?? category.name_ar}</h1>
      <CategoryForm
        initial={{
          id: category.id,
          slug: category.slug,
          parentId: category.parent_id ?? '',
          nameAr: category.name_ar,
          nameEn: category.name_en ?? '',
          descriptionAr: category.description_ar ?? '',
          descriptionEn: category.description_en ?? '',
          sortOrder: category.sort_order,
          imagePath: category.image_path,
        }}
        categories={categories.map((c) => ({ id: c.id, label: c.name_en ?? c.name_ar }))}
      />
    </div>
  );
}
