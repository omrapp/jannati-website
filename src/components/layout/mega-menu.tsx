'use client';

import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { ChevronDown, Menu as MenuIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { DURATION, EASING } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';

import type { CategoryNode, fixedUtilityNav } from './nav-links';

type FixedLink = (typeof fixedUtilityNav)[number];

/**
 * Desktop (`lg`+) primary nav bar: the live category tree as hover/focus
 * mega-menu panels, `fixedLinks` as plain links, and an overflow "More"
 * panel for whatever didn't fit in `MAX_TOP_LEVEL_SLOTS`. Single shared
 * panel area below the bar (not one per trigger) — simplest to keep
 * correctly positioned/mirrored in both text directions, and only one
 * panel is ever open at a time anyway.
 *
 * Disclosure pattern (`aria-expanded`/`aria-controls` on a `<button>`), not
 * ARIA `menu`/`menuitem` roles — those require full roving-tabindex/arrow-key
 * behavior per the APG to be correct, which a hover-first mega menu like
 * this doesn't implement. Plain Tab order + Escape + Enter/Space/ArrowDown
 * is the well-supported, correct-by-default alternative.
 */
export function MegaMenu({
  categories,
  overflowCategories,
  fixedLinks,
}: {
  categories: CategoryNode[];
  overflowCategories: CategoryNode[];
  fixedLinks: readonly FixedLink[];
}) {
  const t = useTranslations();
  const reduceMotion = useReducedMotion();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const panelRef = useRef<HTMLDivElement>(null);

  const openCategory = categories.find((category) => category.id === openKey);
  const isMoreOpen = openKey === 'more';

  function clearCloseTimer() {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimeout.current = setTimeout(() => setOpenKey(null), 150);
  }

  function open(key: string) {
    clearCloseTimer();
    setOpenKey(key);
  }

  function closeAndRefocus(key: string) {
    setOpenKey(null);
    triggerRefs.current.get(key)?.focus();
  }

  // Keyboard/mouse focus leaving the whole nav (triggers + shared panel) closes it.
  function handleBlur(event: React.FocusEvent<HTMLElement>) {
    const next = event.relatedTarget as Node | null;
    if (!next || !navRef.current?.contains(next)) setOpenKey(null);
  }

  // Click outside the nav closes any open panel (mouse users, no focus change).
  useEffect(() => {
    if (!openKey) return;
    function handlePointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenKey(null);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openKey]);

  useEffect(() => () => clearCloseTimer(), []);

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, key: string) {
    if (event.key === 'Escape') {
      closeAndRefocus(key);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      open(key);
      requestAnimationFrame(() => {
        panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
      });
    }
  }

  function handlePanelKeyDown(event: React.KeyboardEvent<HTMLDivElement>, key: string) {
    if (event.key === 'Escape') closeAndRefocus(key);
  }

  const panelTransition = reduceMotion
    ? { duration: DURATION.instant }
    : { duration: DURATION.fast, ease: EASING.out };

  const panelVariants: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : -6 },
    visible: { opacity: 1, y: 0, transition: panelTransition },
    exit: { opacity: 0, y: reduceMotion ? 0 : -6, transition: panelTransition },
  };

  return (
    <nav
      ref={navRef}
      className="relative hidden border-t lg:block"
      aria-label={t('nav.categories')}
      onBlur={handleBlur}
    >
      <ul className="max-w-page mx-auto flex items-center gap-1 px-4 py-1 text-sm">
        {categories.map((category) => {
          const hasChildren = category.children.length > 0;
          const isOpen = openKey === category.id;

          if (!hasChildren) {
            return (
              <li key={category.id}>
                <Link
                  href={`/collections/${category.slug}`}
                  className="hover:text-primary duration-fast ease-default block rounded-md px-3 py-2 font-medium transition-colors"
                >
                  {category.name}
                </Link>
              </li>
            );
          }

          return (
            <li
              key={category.id}
              onMouseEnter={() => open(category.id)}
              onMouseLeave={scheduleClose}
            >
              <button
                type="button"
                ref={(el) => {
                  if (el) triggerRefs.current.set(category.id, el);
                  else triggerRefs.current.delete(category.id);
                }}
                aria-expanded={isOpen}
                aria-controls="mega-menu-panel"
                onFocus={() => open(category.id)}
                onClick={() => (isOpen ? closeAndRefocus(category.id) : open(category.id))}
                onKeyDown={(event) => handleTriggerKeyDown(event, category.id)}
                className={cn(
                  'hover:text-primary duration-fast ease-default flex items-center gap-1 rounded-md px-3 py-2 font-medium transition-colors',
                  isOpen && 'text-primary',
                )}
              >
                {category.name}
                <ChevronDown
                  className={cn(
                    'duration-fast size-3.5 transition-transform',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
            </li>
          );
        })}

        {overflowCategories.length > 0 && (
          <li onMouseEnter={() => open('more')} onMouseLeave={scheduleClose}>
            <button
              type="button"
              ref={(el) => {
                if (el) triggerRefs.current.set('more', el);
                else triggerRefs.current.delete('more');
              }}
              aria-expanded={isMoreOpen}
              aria-controls="mega-menu-panel"
              onFocus={() => open('more')}
              onClick={() => (isMoreOpen ? closeAndRefocus('more') : open('more'))}
              onKeyDown={(event) => handleTriggerKeyDown(event, 'more')}
              className={cn(
                'hover:text-primary duration-fast ease-default flex items-center gap-1 rounded-md px-3 py-2 font-medium transition-colors',
                isMoreOpen && 'text-primary',
              )}
            >
              <MenuIcon className="size-3.5" />
              {t('nav.more')}
              <ChevronDown
                className={cn(
                  'duration-fast size-3.5 transition-transform',
                  isMoreOpen && 'rotate-180',
                )}
              />
            </button>
          </li>
        )}

        {fixedLinks.map((link, index) => (
          <li key={link.href} className={index === 0 ? 'ms-2 border-s ps-3' : undefined}>
            <Link
              href={link.href}
              className="hover:text-primary duration-fast ease-default block rounded-md px-3 py-2 font-medium transition-colors"
            >
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {(openCategory || isMoreOpen) && (
          <motion.div
            key={openKey}
            id="mega-menu-panel"
            ref={panelRef}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={panelVariants}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
            onKeyDown={(event) => handlePanelKeyDown(event, openKey as string)}
            className="bg-popover absolute inset-x-0 top-full z-40 border-t border-b shadow-lg"
          >
            <div className="max-w-page mx-auto px-4 py-6">
              {openCategory && (
                <CategoryPanel
                  category={openCategory}
                  shopAllLabel={(name) => t('nav.shopAll', { name })}
                />
              )}
              {isMoreOpen && <MorePanel categories={overflowCategories} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function CategoryPanel({
  category,
  shopAllLabel,
}: {
  category: CategoryNode;
  shopAllLabel: (name: string) => string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/collections/${category.slug}`}
        className="text-primary w-fit text-sm font-semibold hover:underline"
      >
        {shopAllLabel(category.name)}
      </Link>
      <div className="grid grid-cols-4 gap-4 xl:grid-cols-6">
        {category.children.map((subcategory) => (
          <Link
            key={subcategory.id}
            href={`/collections/${subcategory.slug}`}
            className="group focus-visible:ring-ring/50 flex flex-col gap-2 rounded-md focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="bg-secondary/60 relative flex aspect-square items-center justify-center overflow-hidden rounded-lg">
              {subcategory.imageUrl ? (
                <Image
                  src={subcategory.imageUrl}
                  alt=""
                  fill
                  sizes="120px"
                  className="duration-normal object-cover transition-transform ease-out group-hover:scale-105"
                />
              ) : (
                <span className="from-primary/15 via-accent/10 to-secondary/70 duration-normal size-full bg-gradient-to-br transition-transform ease-out group-hover:scale-105" />
              )}
            </span>
            <span className="group-hover:text-primary duration-fast truncate text-center text-xs font-medium transition-colors">
              {subcategory.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MorePanel({ categories }: { categories: CategoryNode[] }) {
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-1 xl:grid-cols-4">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/collections/${category.slug}`}
          className="hover:text-primary hover:bg-muted duration-fast rounded-md px-2 py-1.5 text-sm font-medium transition-colors"
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}
