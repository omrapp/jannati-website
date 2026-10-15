import type { CategorySummary } from '@/lib/catalog/mappers';

type NavItem = { labelKey: string; href: string };

/**
 * Desktop mega-menu bar's fixed slots, shown alongside the live category
 * tree (`buildCategoryTree` below). Exactly 3 — `MAX_TOP_LEVEL_SLOTS`'s "7
 * slots = categories + 3 fixed" arithmetic (Information Architecture doc)
 * depends on this count staying fixed. `nav.categories`/`nav.about`/
 * `nav.contact` moved out of the primary bar: categories are now the live
 * tree itself, About/Contact stay reachable via the footer
 * (`footerAboutNav`/`footerHelpNav`) without spending one of the 7 slots.
 */
export const fixedUtilityNav: NavItem[] = [
  { labelKey: 'nav.newArrivals', href: '/products?sort=new' },
  { labelKey: 'nav.bestSellers', href: '/products?sort=best-selling' },
  { labelKey: 'nav.brands', href: '/brands' },
];

/**
 * Mobile drawer only, shown below the category accordion. The desktop bar's
 * 7-slot cap has no room for these; a shopper scrolling the drawer one-
 * handed shouldn't have to wait for the footer to reach them either.
 */
export const secondaryNav: NavItem[] = [
  { labelKey: 'nav.products', href: '/products' },
  { labelKey: 'nav.about', href: '/about' },
  { labelKey: 'nav.contact', href: '/contact' },
];

// Own array, not an alias of `fixedUtilityNav` — the footer's "Shop" column
// stays product-listing links only; kept separate so the two navs can
// diverge without one silently changing the other.
export const footerShopNav: NavItem[] = [
  { labelKey: 'nav.products', href: '/products' },
  { labelKey: 'nav.brands', href: '/brands' },
  { labelKey: 'nav.newArrivals', href: '/products?sort=new' },
  { labelKey: 'nav.bestSellers', href: '/products?sort=best-selling' },
];

export const footerHelpNav: NavItem[] = [
  // Real route (Task 5.5), not a `content_pages` slug — needs live
  // `site_settings` data and a stateful form neither a static page can hold.
  { labelKey: 'nav.contact', href: '/contact' },
  { labelKey: 'nav.faq', href: '/p/faqs' },
  { labelKey: 'footer.shipping', href: '/p/shipping-policy' },
  { labelKey: 'footer.returns', href: '/p/returns' },
];

export const footerAboutNav: NavItem[] = [
  { labelKey: 'nav.about', href: '/about' },
  { labelKey: 'footer.privacy', href: '/p/privacy-policy' },
  { labelKey: 'footer.terms', href: '/p/terms-of-service' },
];

/** One top-level category plus its direct subcategories, for the mega menu / mobile accordion. */
export type CategoryNode = CategorySummary & { children: CategorySummary[] };

/**
 * Flat `categories` rows (any depth, admin-managed `parent_id` chain) into a
 * 2-level tree: top-level categories with their direct children attached.
 * Matches the Information Architecture doc's Category/Subcategory naming —
 * only 2 tiers are surfaced in the UI, so a grandchild (a subcategory of a
 * subcategory) is not expected in current data and is simply left out of
 * both tiers rather than guessed at.
 *
 * A category whose `parentId` points at a row not present in `categories`
 * (e.g. an archived parent, since `listCategories` excludes archived rows by
 * default) is treated as top-level rather than silently dropped.
 */
export function buildCategoryTree(categories: CategorySummary[]): CategoryNode[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const childrenByParent = new Map<string, CategorySummary[]>();

  for (const category of categories) {
    if (category.parentId && byId.has(category.parentId)) {
      const siblings = childrenByParent.get(category.parentId) ?? [];
      siblings.push(category);
      childrenByParent.set(category.parentId, siblings);
    }
  }

  return categories
    .filter((category) => !category.parentId || !byId.has(category.parentId))
    .map((category) => ({ ...category, children: childrenByParent.get(category.id) ?? [] }));
}

/** Desktop mega-menu bar total top-level slots (live categories + `fixedUtilityNav`) before overflow. */
export const MAX_TOP_LEVEL_SLOTS = 7;

export type PartitionedCategories = { visible: CategoryNode[]; overflow: CategoryNode[] };

/**
 * Splits top-level categories into what fits directly in the bar versus
 * what spills into the "More" panel, reserving one slot for the "More"
 * trigger itself when there's overflow so the bar never exceeds
 * `MAX_TOP_LEVEL_SLOTS` total (categories + `fixedUtilityNav.length` + "More").
 */
export function partitionTopLevelCategories(
  topLevel: CategoryNode[],
  fixedSlotCount: number,
): PartitionedCategories {
  const maxCategorySlots = Math.max(0, MAX_TOP_LEVEL_SLOTS - fixedSlotCount);
  if (topLevel.length <= maxCategorySlots) return { visible: topLevel, overflow: [] };

  const visibleCount = Math.max(0, maxCategorySlots - 1); // 1 slot reserved for "More"
  return { visible: topLevel.slice(0, visibleCount), overflow: topLevel.slice(visibleCount) };
}
