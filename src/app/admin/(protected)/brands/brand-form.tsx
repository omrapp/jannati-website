'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { idleBrandFormState, saveBrand } from './actions';

export type BrandFormInitial = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionAr: string;
  descriptionEn: string;
  logoPath: string;
  sortOrder: number;
};

export function BrandForm({ initial }: { initial: BrandFormInitial | null }) {
  const [state, formAction, pending] = useActionState(
    saveBrand.bind(null, initial?.id ?? null),
    idleBrandFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" defaultValue={initial?.slug} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input id="sortOrder" name="sortOrder" type="number" defaultValue={initial?.sortOrder ?? 0} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nameEn">Name (en)</Label>
          <Input id="nameEn" name="nameEn" defaultValue={initial?.nameEn} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nameAr">Name (ar)</Label>
          <Input id="nameAr" name="nameAr" dir="rtl" defaultValue={initial?.nameAr} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="descriptionEn">Description (en)</Label>
          <Textarea id="descriptionEn" name="descriptionEn" defaultValue={initial?.descriptionEn} rows={4} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="descriptionAr">Description (ar)</Label>
          <Textarea
            id="descriptionAr"
            name="descriptionAr"
            dir="rtl"
            defaultValue={initial?.descriptionAr}
            rows={4}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 max-w-xs">
        <Label htmlFor="logoPath">Logo Storage path</Label>
        <Input id="logoPath" name="logoPath" defaultValue={initial?.logoPath} placeholder="brands/acme.webp" />
      </div>

      {state.status === 'error' && <p className="text-destructive text-sm">{state.message}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save brand'}
        </Button>
      </div>
    </form>
  );
}
