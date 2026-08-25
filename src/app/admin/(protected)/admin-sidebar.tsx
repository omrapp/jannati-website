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
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-context';

// `labelKey` resolves against the `sidebar` namespace in `admin-{en,ar}.json`
// via `t(labelKey)` in `SidebarNav`/`SidebarLogo` — kept as data here (not a
// literal label) since this array is module-level, outside any component
// that could call `useTranslations`.
type NavItem = { href: string; labelKey: string; icon: LucideIcon };
type NavGroup = { labelKey: string; items: NavItem[] };

// Grouped the way TailAdmin's reference sidebar groups its menu, but every
// item here links straight to an existing route — no submenus, since none
// of the current admin routes nest under each other.
const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'overview',
    items: [
      { href: '/admin', labelKey: 'dashboard', icon: LayoutDashboard },
      { href: '/admin/analytics', labelKey: 'analytics', icon: BarChart3 },
    ],
  },
  {
    labelKey: 'catalog',
    items: [
      { href: '/admin/products', labelKey: 'products', icon: Package },
      { href: '/admin/brands', labelKey: 'brands', icon: Tag },
      { href: '/admin/categories', labelKey: 'categories', icon: Layers },
    ],
  },
  {
    labelKey: 'sales',
    items: [
      { href: '/admin/orders', labelKey: 'orders', icon: ShoppingCart },
      { href: '/admin/invoices', labelKey: 'invoices', icon: Receipt },
      { href: '/admin/customers', labelKey: 'customers', icon: Users },
      { href: '/admin/coupons', labelKey: 'coupons', icon: Ticket },
      { href: '/admin/countries', labelKey: 'countries', icon: Globe },
    ],
  },
  {
    labelKey: 'content',
    items: [
      { href: '/admin/banners', labelKey: 'banners', icon: ImageIcon },
      { href: '/admin/content-pages', labelKey: 'contentPages', icon: FileText },
      { href: '/admin/reviews', labelKey: 'reviews', icon: Star },
      { href: '/admin/messages', labelKey: 'messages', icon: Mail },
    ],
  },
  {
    labelKey: 'system',
    items: [{ href: '/admin/settings', labelKey: 'settings', icon: Settings }],
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
  const t = useTranslations('sidebar');

  return (
    <div className={cn('flex h-16 shrink-0 items-center border-b px-4', collapsed && 'justify-center px-0')}>
      <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2 font-semibold">
        <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm">
          J
        </span>
        {!collapsed && <span className="text-foreground">{t('brand')}</span>}
      </Link>
    </div>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const t = useTranslations('sidebar');
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.labelKey}>
          {!collapsed && (
            <h3 className="text-muted-foreground mb-2 px-3 text-xs font-semibold tracking-wider uppercase">
              {t(group.labelKey)}
            </h3>
          )}
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = isActiveHref(pathname, item.href);
              const Icon = item.icon;
              const label = t(item.labelKey);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? label : undefined}
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
                    {!collapsed && <span>{label}</span>}
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
  const t = useTranslations('sidebar');
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
            <SheetTitle>{t('navigationLabel')}</SheetTitle>
          </SheetHeader>
          <SidebarLogo collapsed={false} onNavigate={() => setIsMobileOpen(false)} />
          <SidebarNav collapsed={false} onNavigate={() => setIsMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
