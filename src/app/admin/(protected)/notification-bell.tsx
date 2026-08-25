'use client';

import { useState, useTransition } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { NotificationSummary } from '@/lib/admin/notifications';
import { cn } from '@/lib/utils';
import { markNotificationsSeenAction } from './notification-actions';

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * `initial` is server-fetched once per navigation in `layout.tsx` (service-
 * role `getNotificationSummary`, same posture as the dashboard's analytics
 * fetch) and threaded down through `AdminShell` → `AdminHeader`. Opening the
 * panel fires `markNotificationsSeenAction` (advances the cursor) and clears
 * the badge locally — no polling, matching this dashboard's no-realtime
 * scope elsewhere.
 */
export function NotificationBell({ initial }: { initial: NotificationSummary }) {
  const [unseenCount, setUnseenCount] = useState(initial.unseenCount);
  const [, startTransition] = useTransition();

  const handleOpenChange = (open: boolean) => {
    if (!open || unseenCount === 0) return;
    setUnseenCount(0);
    startTransition(() => {
      void markNotificationsSeenAction();
    });
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-5" />
          {unseenCount > 0 && (
            <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
              {unseenCount > 9 ? '9+' : unseenCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {initial.items.length === 0 ? (
          <p className="text-muted-foreground p-3 text-sm">Nothing new.</p>
        ) : (
          initial.items.map((item) => (
            <DropdownMenuItem key={item.id} asChild>
              <Link href={item.href} className="flex flex-col items-start gap-0.5 py-2">
                <span className={cn('text-sm', item.isNew && 'font-medium')}>{item.title}</span>
                <span className="text-muted-foreground text-xs">{timeAgo(item.createdAt)}</span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
