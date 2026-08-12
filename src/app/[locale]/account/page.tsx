import { getTranslations } from 'next-intl/server';

import { PagePlaceholder } from '@/components/layout/page-placeholder';

export default async function AccountPage() {
  const t = await getTranslations('common');
  return <PagePlaceholder title={t('account')} />;
}
