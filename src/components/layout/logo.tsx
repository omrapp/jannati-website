import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Wordmark placeholder. Swap the glyph for the supplied Jannati logo once
 * brand assets arrive; the layout around it stays the same.
 */
export function Logo({ className }: { className?: string }) {
  const t = useTranslations('brand');

  return (
    <Link
      href="/"
      className={cn('group flex items-center gap-2', className)}
      aria-label={t('name')}
    >
      <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-full text-lg font-semibold">
        ج
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-xl font-semibold tracking-tight">{t('name')}</span>
        <span className="text-muted-foreground hidden text-[11px] sm:block">{t('tagline')}</span>
      </span>
    </Link>
  );
}
