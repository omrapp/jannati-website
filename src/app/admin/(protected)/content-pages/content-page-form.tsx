'use client';

import { useActionState } from 'react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { idleContentPageFormState, saveContentPage } from './actions';

export type ContentPageFormInitial = {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  heroImageUrl: string;
  published: boolean;
};

export function ContentPageForm({ initial }: { initial: ContentPageFormInitial | null }) {
  const [state, formAction, pending] = useActionState(
    saveContentPage.bind(null, initial?.id ?? null),
    idleContentPageFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex max-w-xs flex-col gap-1.5">
        <Label htmlFor="slug">Slug</Label>
        {initial ? (
          // Fixed past creation — existing `/[locale]/p/[slug]` links would
          // break otherwise. See `content-pages.ts`'s file comment.
          <Input id="slug" value={initial.slug} disabled />
        ) : (
          <Input id="slug" name="slug" placeholder="about" required />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="titleEn">Title (en)</Label>
          <Input id="titleEn" name="titleEn" defaultValue={initial?.titleEn} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="titleAr">Title (ar)</Label>
          <Input id="titleAr" name="titleAr" dir="rtl" defaultValue={initial?.titleAr} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bodyEn">Body (en)</Label>
          <Textarea id="bodyEn" name="bodyEn" rows={10} defaultValue={initial?.bodyEn} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bodyAr">Body (ar)</Label>
          <Textarea
            id="bodyAr"
            name="bodyAr"
            dir="rtl"
            rows={10}
            defaultValue={initial?.bodyAr}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="heroImageUrl">Hero image URL</Label>
        <Input
          id="heroImageUrl"
          name="heroImageUrl"
          type="url"
          placeholder="https://images.pexels.com/..."
          defaultValue={initial?.heroImageUrl}
        />
        <span className="text-muted-foreground text-xs">
          Shown as a banner at the top of the page. Leave blank for no hero image.
        </span>
      </div>

      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" name="published" defaultChecked={initial?.published ?? false} />
        Published
      </label>

      {state.status === 'error' && <p className="text-destructive text-sm">{state.message}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save page'}
        </Button>
      </div>
    </form>
  );
}
