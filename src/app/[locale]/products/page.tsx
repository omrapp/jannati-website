import { getTranslations } from 'next-intl/server';

import { PagePlaceholder } from '@/components/layout/page-placeholder';

export default async function ProductsPage() {
  const t = await getTranslations('nav');
  return <PagePlaceholder title={t('products')} />;
}
