'use client';

import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { NotificationSummary } from '@/lib/admin/notifications';
import { logout } from './actions';
import { AdminThemeToggle } from './admin-theme-toggle';
import { NotificationBell } from './notification-bell';
import { useSidebar } from './sidebar-context';

export function AdminHeader({ email, notifications }: { email: string; notifications: NotificationSummary }) {
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();

  // One button, two behaviors: below `lg` the sidebar is an off-canvas
  // `Sheet` (open/close), at `lg` and up it's the fixed rail
  // (expand/collapse) — matching which sidebar rendering is actually
  // visible at that width in `admin-sidebar.tsx`.
  const handleToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="bg-background sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6">
      <Button variant="ghost" size="icon" aria-label="Toggle sidebar" onClick={handleToggle}>
        <Menu className="size-5" />
      </Button>

      {/* Search slot — TailAdmin's AppHeader reserves this spot for a
          global search input. The admin CRUD has no cross-entity search
          endpoint yet, so this stays empty rather than shipping a dead
          input; wire it up when that endpoint exists. */}

      <div className="ms-auto flex items-center gap-1">
        <AdminThemeToggle />
        <NotificationBell initial={notifications} />

        <div className="ms-2 flex items-center gap-3 border-s ps-3 text-sm">
          <span className="text-muted-foreground hidden sm:inline">{email}</span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
