import { Button } from '@/components/ui/button';
import { logout } from './actions';

/**
 * Nav links get added here as each Phase 3 task lands a real page —
 * `/admin/products`, `/admin/orders`, etc. don't exist yet (3.2+), so
 * linking to them now would be dead links.
 */
export function AdminNav({ email }: { email: string }) {
  return (
    <header className="flex items-center justify-between border-b pb-4">
      <span className="font-semibold">Jannati Admin</span>
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
