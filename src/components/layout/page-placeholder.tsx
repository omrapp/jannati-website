import { useTranslations } from 'next-intl';

/**
 * Temporary stand-in so navigation is never broken while later phases are
 * still being built. Each placeholder is replaced by the real page in its phase.
 */
export function PagePlaceholder({ title }: { title: string }) {
  const t = useTranslations('common');

  return (
    <div className="mx-auto max-w-7xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <p className="text-muted-foreground mt-3">{t('comingSoon')}</p>
    </div>
  );
}
