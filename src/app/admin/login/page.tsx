import { createTranslator } from 'next-intl';

import { getAdminLocale, getAdminMessages } from '@/lib/admin/locale';
import { LoginForm } from './login-form';

/**
 * Server Component outside `NextIntlClientProvider`'s client-hook reach —
 * `useTranslations` only works in a Client Component, and `next-intl/server`'s
 * `getTranslations` needs `getRequestConfig`, which `/admin` deliberately
 * doesn't have (see `admin/layout.tsx`). So this loads the admin locale and
 * messages itself and translates with next-intl's non-routing
 * `createTranslator`, the same pattern `login/actions.ts` uses.
 */
export default async function AdminLoginPage() {
  const locale = await getAdminLocale();
  const messages = await getAdminMessages(locale);
  const t = createTranslator({ locale, messages, namespace: 'login' });

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8 px-4 py-16">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </header>

      <LoginForm />
    </div>
  );
}
