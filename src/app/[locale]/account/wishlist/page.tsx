import { getTranslations } from 'next-intl/server';

import { PagePlaceholder } from '@/components/layout/page-placeholder';

export default async function WishlistPage() {
  const t = await getTranslations('common');
  return <PagePlaceholder title={t('wishlist')} />;
}
