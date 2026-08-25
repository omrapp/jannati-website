'use client';

import {
  BarChart3,
  FileText,
  Globe,
  Image as ImageIcon,
  LayoutDashboard,
  Layers,
  Mail,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Star,
  Tag,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-context';

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

// Grouped the way TailAdmin's reference sidebar groups its menu, but every
// item here links straight to an existing route — no submenus, since none
// of the current admin routes nest under each other.
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/brands', label: 'Brands', icon: Tag },
      { href: '/admin/categories', label: 'Categories', icon: Layers },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/admin/invoices', label: 'Invoices', icon: Receipt },
      { href: '/admin/customers', label: 'Customers', icon: Users },
      { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
      { href: '/admin/countries', label: 'Countries', icon: Globe },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
      { href: '/admin/content-pages', label: 'Pages', icon: FileText },
      { href: '/admin/reviews', label: 'Reviews', icon: Star },
      { href: '/admin/messages', label: 'Messages', icon: Mail },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/admin/settings', label: 'Settings', icon: Settings }],
  },
];

// `/admin` itself must match exactly — every other route is a prefix match
// so a nested detail page (e.g. `/admin/products/new`) still highlights its
// list item, without `/admin` ending up permanently active too.
function isActiveHref(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLogo({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <div className={cn('flex h-16 shrink-0 items-center border-b px-4', collapsed && 'justify-center px-0')}>
      <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2 font-semibold">
        <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm">
          J
        </span>
        {!collapsed && <span className="text-foreground">Jannati Admin</span>}
      </Link>
    </div>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <h3 className="text-muted-foreground mb-2 px-3 text-xs font-semibold tracking-wider uppercase">
              {group.label}
            </h3>
          )}
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = isActiveHref(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      collapsed && 'justify-center',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Two renderings of the same nav, not one component reused twice: the fixed
 * desktop rail (`lg:flex`, width driven by expanded/hovered state) and the
 * mobile overlay (a `Sheet` at any width below `lg`), matching how
 * `admin-header.tsx`'s single toggle button branches between
 * `toggleSidebar` and `toggleMobileSidebar` by viewport.
 */
export function AdminSidebar() {
  const { isExpanded, isHovered, isMobileOpen, setIsHovered, setIsMobileOpen } = useSidebar();
  const collapsed = !isExpanded && !isHovered;

  return (
    <>
      <aside
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'bg-card fixed inset-y-0 start-0 z-40 hidden flex-col border-e transition-[width] duration-300 ease-in-out lg:flex',
          isExpanded || isHovered ? 'w-[290px]' : 'w-[90px]',
        )}
      >
        <SidebarLogo collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} />
      </aside>

      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-[290px] gap-0 p-0 sm:max-w-[290px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Admin navigation</SheetTitle>
          </SheetHeader>
          <SidebarLogo collapsed={false} onNavigate={() => setIsMobileOpen(false)} />
          <SidebarNav collapsed={false} onNavigate={() => setIsMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
