import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * The Jannati flower mark beside the wordmark. The mark is a transparent PNG,
 * so it sits on either theme without a variant.
 */
export function Logo({ className }: { className?: string }) {
  const t = useTranslations('brand');

  return (
    <Link
      href="/"
      className={cn('group flex items-center gap-2', className)}
      aria-label={t('name')}
    >
      <Image
        src="/brand/jannati-logo.png"
        alt=""
        width={36}
        height={36}
        priority
        className="size-9 object-contain"
      />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-xl font-semibold tracking-tight">{t('name')}</span>
        <span className="text-muted-foreground hidden text-[11px] sm:block">{t('tagline')}</span>
      </span>
    </Link>
  );
}
