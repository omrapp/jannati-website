import { redirect } from 'next/navigation';

import { defaultLocale } from '@/i18n/config';
import { checkAdminAccess } from '@/lib/admin/auth';
import { AdminNav } from './admin-nav';

/**
 * The role gate every other `/admin` page depends on — everything under this
 * route group requires an `admin_users` row. `/admin/login` sits outside the
 * group deliberately, so it's reachable without one.
 *
 * Not signed in and signed in but not staff both land here: both come back
 * `isAdmin: false` from `checkAdminAccess`, but get different redirects — a
 * stranger goes to the storefront, not to a login form that would just
 * confirm "this account exists but isn't staff" to whoever's poking at it.
 */
export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Checked on `access.isAdmin`, not a destructured `isAdmin` — destructuring
  // the discriminated union would lose the link TS needs to narrow
  // `access.user` from `User | null` to `User` past this guard.
  const access = await checkAdminAccess();
  if (!access.isAdmin) redirect(access.user ? `/${defaultLocale}` : '/admin/login');

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-4 py-8">
      <AdminNav email={access.user.email ?? ''} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
