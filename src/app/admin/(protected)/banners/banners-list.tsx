'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { publicBannerUrl } from '@/lib/admin/banners';
import { reorderBannersAction } from './actions';

export type BannerRow = {
  id: string;
  imagePath: string;
  titleAr: string | null;
  titleEn: string | null;
  active: boolean;
};

// Same up/down reorder shape as `ProductImages` — full-replace on every
// move rather than a real drag, matches `reorderBanners`'s all-rows write.
export function BannersList({ banners }: { banners: BannerRow[] }) {
  const [pending, startTransition] = useTransition();

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;

    const next = [...banners];
    [next[index], next[target]] = [next[target], next[index]];
    startTransition(() => {
      reorderBannersAction(next.map((b) => b.id));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {banners.map((b, index) => (
        <div key={b.id} className="grid grid-cols-[auto_80px_1fr_auto_auto] items-center gap-3 rounded-md border p-3">
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || index === 0}
              onClick={() => move(index, -1)}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || index === banners.length - 1}
              onClick={() => move(index, 1)}
            >
              ↓
            </Button>
          </div>
          <Image
            src={publicBannerUrl(b.imagePath)}
            alt=""
            width={80}
            height={40}
            className="h-10 w-20 rounded object-cover"
          />
          <span>{b.titleEn || b.titleAr || '(no title)'}</span>
          <Badge variant={b.active ? 'default' : 'secondary'}>{b.active ? 'Active' : 'Inactive'}</Badge>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/banners/${b.id}`}>Edit</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}
