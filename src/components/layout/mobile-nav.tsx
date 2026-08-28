'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown, Menu } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';

import { CountrySwitcher } from '@/components/layout/country-switcher';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { fixedUtilityNav, secondaryNav, type CategoryNode } from '@/components/layout/nav-links';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { parseLocale, textDirection, type CountryCode, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { DURATION, EASING } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';

export function MobileNav({
  enabledCountries,
  categories,
}: {
  enabledCountries: readonly CountryCode[];
  categories: CategoryNode[];
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // The drawer opens from the side the page starts on: right in Arabic, left in English.
  const side = textDirection(parseLocale(locale).language) === 'rtl' ? 'right' : 'left';

  function closeDrawer() {
    setOpen(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setExpandedId(null);
      }}
    >
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('nav.openMenu')}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side={side} className="w-80 gap-0 sm:max-w-sm">
        <SheetHeader className="border-b pb-3">
          <SheetTitle>{t('brand.name')}</SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label={t('nav.categories')}>
          <ul className="flex flex-col">
            {categories.map((category) => (
              <CategoryAccordionRow
                key={category.id}
                category={category}
                isExpanded={expandedId === category.id}
                onToggle={() =>
                  setExpandedId((current) => (current === category.id ? null : category.id))
                }
                onNavigate={closeDrawer}
              />
            ))}
          </ul>

          <Separator className="my-2" />

          <ul className="flex flex-col">
            {fixedUtilityNav.concat(secondaryNav).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeDrawer}
                  className="hover:bg-muted duration-fast ease-default flex min-h-11 items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t p-4">
          <CountrySwitcher enabled={enabledCountries} />
          <LocaleSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CategoryAccordionRow({
  category,
  isExpanded,
  onToggle,
  onNavigate,
}: {
  category: CategoryNode;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const hasChildren = category.children.length > 0;
  const panelId = `mobile-nav-panel-${category.id}`;

  if (!hasChildren) {
    return (
      <li>
        <Link
          href={`/collections/${category.slug}`}
          onClick={onNavigate}
          className="hover:bg-muted duration-fast ease-default flex min-h-11 items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
        >
          {category.name}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className="flex items-center">
        <Link
          href={`/collections/${category.slug}`}
          onClick={onNavigate}
          className="hover:bg-muted duration-fast ease-default flex min-h-11 flex-1 items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
        >
          {category.name}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          aria-label={category.name}
          className="hover:bg-muted duration-fast ease-default flex size-11 shrink-0 items-center justify-center rounded-md transition-colors"
        >
          <ChevronDown
            className={cn(
              'duration-fast ease-default size-4 transition-transform',
              isExpanded && 'rotate-180',
            )}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={panelId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: reduceMotion
                ? { duration: DURATION.instant }
                : {
                    height: { duration: DURATION.normal, ease: EASING.out },
                    opacity: { duration: DURATION.fast },
                  },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: reduceMotion
                ? { duration: DURATION.instant }
                : {
                    height: { duration: DURATION.fast, ease: EASING.default },
                    opacity: { duration: DURATION.instant },
                  },
            }}
            className="overflow-hidden"
          >
            <ul className="ps-3">
              {category.children.map((subcategory) => (
                <li key={subcategory.id}>
                  <Link
                    href={`/collections/${subcategory.slug}`}
                    onClick={onNavigate}
                    className="hover:bg-muted duration-fast ease-default flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                  >
                    <span className="bg-secondary/60 relative size-8 shrink-0 overflow-hidden rounded-md">
                      {subcategory.imageUrl ? (
                        <Image
                          src={subcategory.imageUrl}
                          alt=""
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="from-primary/15 via-accent/10 to-secondary/70 block size-full bg-gradient-to-br" />
                      )}
                    </span>
                    <span className="text-muted-foreground">{subcategory.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
