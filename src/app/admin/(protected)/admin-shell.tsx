'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { AdminHeader } from './admin-header';
import { AdminSidebar } from './admin-sidebar';
import { SidebarProvider, useSidebar } from './sidebar-context';

/**
 * Content column shifts to clear the fixed sidebar's current width — `290px`
 * expanded/hovered, `90px` collapsed, `0` below `lg` where the sidebar is an
 * off-canvas `Sheet` instead of occupying layout space. Logical
 * (`ms-`/margin-inline-start) rather than `ml-` so this flips correctly once
 * the AR/RTL step sets `dir="rtl"`.
 */
function AdminShellBody({ email, children }: { email: string; children: ReactNode }) {
  const { isExpanded, isHovered } = useSidebar();

  return (
    <div className="bg-background min-h-dvh">
      <AdminSidebar />
      <div
        className={cn(
          'flex min-h-dvh flex-col transition-[margin] duration-300 ease-in-out',
          isExpanded || isHovered ? 'lg:ms-[290px]' : 'lg:ms-[90px]',
        )}
      >
        <AdminHeader email={email} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  return (
    <SidebarProvider>
      <AdminShellBody email={email}>{children}</AdminShellBody>
    </SidebarProvider>
  );
}
