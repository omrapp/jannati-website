'use client';

import Image from 'next/image';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { publicBannerUrl } from '@/lib/admin/banners';
import { idleBannerFormState, saveBanner } from './actions';

export type BannerFormInitial = {
  id: string;
  imagePath: string;
  link: string;
  titleAr: string;
  titleEn: string;
  sortOrder: number;
  active: boolean;
};

export function BannerForm({ initial }: { initial: BannerFormInitial | null }) {
  const [state, formAction, pending] = useActionState(
    saveBanner.bind(null, initial?.id ?? null),
    idleBannerFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {initial && (
        <Image
          src={publicBannerUrl(initial.imagePath)}
          alt=""
          width={320}
          height={120}
          className="h-30 w-80 rounded object-cover"
        />
      )}

      <div className="flex flex-col gap-1.5 max-w-xs">
        <Label htmlFor="image">{initial ? 'Replace image (optional)' : 'Image'}</Label>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required={!initial}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="titleEn">Title (en)</Label>
          <Input id="titleEn" name="titleEn" defaultValue={initial?.titleEn} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="titleAr">Title (ar)</Label>
          <Input id="titleAr" name="titleAr" dir="rtl" defaultValue={initial?.titleAr} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="link">Link</Label>
          <Input id="link" name="link" placeholder="/collections/summer" defaultValue={initial?.link} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input id="sortOrder" name="sortOrder" type="number" defaultValue={initial?.sortOrder ?? 0} />
        </div>
      </div>

      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} />
        Active
      </label>

      {state.status === 'error' && <p className="text-destructive text-sm">{state.message}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save banner'}
        </Button>
      </div>
    </form>
  );
}
