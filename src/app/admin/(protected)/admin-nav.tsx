import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { logout } from './actions';

// Links added here as each Phase 3 task lands a real page — a link to a
// route that doesn't exist yet would be dead.
const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/brands', label: 'Brands' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/orders', label: 'Orders' },
];

export function AdminNav({ email }: { email: string }) {
  return (
    <header className="flex items-center justify-between border-b pb-4">
      <nav className="flex items-center gap-4">
        <span className="font-semibold">Jannati Admin</span>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-muted-foreground text-sm hover:text-foreground">
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{email}</span>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
