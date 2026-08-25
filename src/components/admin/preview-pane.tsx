'use client';

import type { ReactNode } from 'react';
import { EyeIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

/**
 * Generic slide-over wrapper for "live preview" trigger buttons across admin
 * forms. Built on the existing `Sheet` primitive — this component owns only
 * the trigger + panel chrome; callers pass whatever preview content (e.g.
 * `ProductPreviewCard`, `ContentPagePreview`) as `children`, re-rendered on
 * every keystroke since it reads the same controlled state the form does.
 */
export function PreviewPane({
  title,
  description,
  triggerLabel = 'Preview',
  children,
}: {
  title: string;
  description?: string;
  triggerLabel?: string;
  children: ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline">
          <EyeIcon />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
