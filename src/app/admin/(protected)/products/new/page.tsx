import { createClient } from '@/lib/supabase/server';
import { ProductForm } from '../product-form';

export default async function NewProductPage() {
  const client = await createClient();
  const [{ data: brands }, { data: categories }] = await Promise.all([
    client.from('brands').select('id, name_en').order('name_en'),
    client.from('categories').select('id, name_en, name_ar').order('sort_order'),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">New product</h1>
      <ProductForm
        initial={null}
        brands={(brands ?? []).map((b) => ({ id: b.id, nameEn: b.name_en }))}
        categories={(categories ?? []).map((c) => ({ id: c.id, nameEn: c.name_en ?? '', nameAr: c.name_ar }))}
      />
    </div>
  );
}
