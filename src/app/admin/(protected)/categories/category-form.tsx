'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { idleCategoryFormState, saveCategory } from './actions';

export type CategoryFormInitial = {
  id: string;
  slug: string;
  parentId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  sortOrder: number;
};

export function CategoryForm({
  initial,
  categories,
}: {
  initial: CategoryFormInitial | null;
  categories: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    saveCategory.bind(null, initial?.id ?? null),
    idleCategoryFormState,
  );

  // A category can't be reparented under itself — omit it, not just rely on
  // the server's cycle check, so staff never even see the invalid option.
  const parentOptions = categories.filter((c) => c.id !== initial?.id);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" defaultValue={initial?.slug} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="parentId">Parent category</Label>
          <select
            id="parentId"
            name="parentId"
            defaultValue={initial?.parentId ?? ''}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">None (top level)</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input id="sortOrder" name="sortOrder" type="number" defaultValue={initial?.sortOrder ?? 0} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nameAr">Name (ar)</Label>
          <Input id="nameAr" name="nameAr" dir="rtl" defaultValue={initial?.nameAr} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nameEn">Name (en)</Label>
          <Input id="nameEn" name="nameEn" defaultValue={initial?.nameEn} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="descriptionEn">Description (en)</Label>
          <Textarea id="descriptionEn" name="descriptionEn" defaultValue={initial?.descriptionEn} rows={4} />
        </div>
      </div>

      {state.status === 'error' && <p className="text-destructive text-sm">{state.message}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save category'}
        </Button>
      </div>
    </form>
  );
}
