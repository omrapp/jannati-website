import { notFound } from 'next/navigation';

import { listProductImages } from '@/lib/admin/images';
import { getProductForEdit } from '@/lib/admin/products';
import { minorToDecimalString, OMR_EXPONENT } from '@/lib/commerce/money';
import { createClient } from '@/lib/supabase/server';
import { ProductForm } from '../product-form';
import { ProductImages } from './product-images';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createClient();

  const [result, { data: brands }, { data: categories }, images] = await Promise.all([
    getProductForEdit(client, id),
    client.from('brands').select('id, name_en').order('name_en'),
    client.from('categories').select('id, name_en, name_ar').order('sort_order'),
    listProductImages(client, id),
  ]);
  if (!result) notFound();

  const { product, variants, categoryIds } = result;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{product.name_en ?? product.name_ar}</h1>
      <ProductForm
        initial={{
          id: product.id,
          handle: product.handle,
          nameAr: product.name_ar,
          nameEn: product.name_en ?? '',
          descriptionAr: product.description_ar ?? '',
          descriptionEn: product.description_en ?? '',
          brandId: product.brand_id ?? '',
          status: product.status,
          categoryIds,
          variants: variants.map((v) => ({
            id: v.id,
            sku: v.sku ?? '',
            titleAr: v.title_ar ?? '',
            titleEn: v.title_en ?? '',
            priceMajor: minorToDecimalString(v.base_price_minor, OMR_EXPONENT),
            compareAtMajor: v.compare_at_minor !== null ? minorToDecimalString(v.compare_at_minor, OMR_EXPONENT) : '',
            stockQty: String(v.stock_qty),
            position: v.position,
          })),
        }}
        brands={(brands ?? []).map((b) => ({ id: b.id, nameEn: b.name_en }))}
        categories={(categories ?? []).map((c) => ({ id: c.id, nameEn: c.name_en ?? '', nameAr: c.name_ar }))}
      />
      <ProductImages
        productId={product.id}
        images={images.map((img) => ({
          id: img.id,
          storagePath: img.storage_path,
          altAr: img.alt_ar,
          altEn: img.alt_en,
          position: img.position,
        }))}
      />
    </div>
  );
}
