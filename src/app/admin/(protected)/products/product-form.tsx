'use client';

import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { idleProductFormState, saveProduct } from './actions';

type VariantRow = {
  id?: string;
  sku: string;
  titleAr: string;
  titleEn: string;
  priceMajor: string;
  compareAtMajor: string;
  stockQty: string;
  position: number;
};

function emptyVariant(position: number): VariantRow {
  return { sku: '', titleAr: '', titleEn: '', priceMajor: '', compareAtMajor: '', stockQty: '0', position };
}

export type ProductFormInitial = {
  id: string;
  handle: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  brandId: string;
  status: 'draft' | 'active' | 'archived';
  categoryIds: string[];
  variants: VariantRow[];
};

export function ProductForm({
  initial,
  brands,
  categories,
}: {
  initial: ProductFormInitial | null;
  brands: { id: string; nameEn: string }[];
  categories: { id: string; nameEn: string; nameAr: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    saveProduct.bind(null, initial?.id ?? null),
    idleProductFormState,
  );
  const [variants, setVariants] = useState<VariantRow[]>(
    initial && initial.variants.length > 0 ? initial.variants : [emptyVariant(1)],
  );
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set(initial?.categoryIds ?? []));

  function updateVariant(index: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addVariant() {
    setVariants((rows) => [...rows, emptyVariant(rows.length + 1)]);
  }

  function removeVariant(index: number) {
    setVariants((rows) => rows.filter((_, i) => i !== index));
  }

  function toggleCategory(id: string) {
    setCategoryIds((ids) => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input
        type="hidden"
        name="variantsJson"
        value={JSON.stringify(
          variants.map((v) => ({
            id: v.id,
            sku: v.sku.trim() || null,
            titleAr: v.titleAr.trim() || null,
            titleEn: v.titleEn.trim() || null,
            priceMajor: v.priceMajor,
            compareAtMajor: v.compareAtMajor.trim() || null,
            stockQty: Number(v.stockQty) || 0,
            position: v.position,
          })),
        )}
      />
      <input type="hidden" name="categoryIdsJson" value={JSON.stringify([...categoryIds])} />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="handle">Handle</Label>
          <Input id="handle" name="handle" defaultValue={initial?.handle} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? 'draft'}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nameAr">Name (Arabic)</Label>
          <Input id="nameAr" name="nameAr" defaultValue={initial?.nameAr} required dir="rtl" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nameEn">Name (English)</Label>
          <Input id="nameEn" name="nameEn" defaultValue={initial?.nameEn} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="descriptionAr">Description (Arabic)</Label>
          <Textarea id="descriptionAr" name="descriptionAr" defaultValue={initial?.descriptionAr} dir="rtl" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="descriptionEn">Description (English)</Label>
          <Textarea id="descriptionEn" name="descriptionEn" defaultValue={initial?.descriptionEn} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="brandId">Brand</Label>
        <select
          id="brandId"
          name="brandId"
          defaultValue={initial?.brandId ?? ''}
          className="border-input h-9 max-w-xs rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">No brand</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nameEn}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Categories</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={categoryIds.has(c.id)}
                onChange={() => toggleCategory(c.id)}
              />
              {c.nameEn || c.nameAr}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Variants</legend>
        {variants.map((variant, index) => (
          <div key={index} className="grid grid-cols-7 items-end gap-2 rounded-md border p-3">
            <div className="flex flex-col gap-1">
              <Label>SKU</Label>
              <Input value={variant.sku} onChange={(e) => updateVariant(index, { sku: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Title (ar)</Label>
              <Input dir="rtl" value={variant.titleAr} onChange={(e) => updateVariant(index, { titleAr: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Title (en)</Label>
              <Input value={variant.titleEn} onChange={(e) => updateVariant(index, { titleEn: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Price (OMR)</Label>
              <Input
                inputMode="decimal"
                placeholder="6.400"
                value={variant.priceMajor}
                onChange={(e) => updateVariant(index, { priceMajor: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Compare-at</Label>
              <Input
                inputMode="decimal"
                value={variant.compareAtMajor}
                onChange={(e) => updateVariant(index, { compareAtMajor: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Stock</Label>
              <Input
                type="number"
                min={0}
                value={variant.stockQty}
                onChange={(e) => updateVariant(index, { stockQty: e.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={variants.length === 1}
              onClick={() => removeVariant(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={addVariant}>
          Add variant
        </Button>
      </fieldset>

      {state.status === 'error' && (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="self-start">
        {initial ? 'Save changes' : 'Create product'}
      </Button>
    </form>
  );
}
