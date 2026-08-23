type NavItem = { labelKey: string; href: string };

/**
 * Primary navigation. Replaced by DB-driven categories in Phase 1 — until then
 * these are the fixed entry points into the catalog.
 */
export const primaryNav: NavItem[] = [
  { labelKey: 'nav.categories', href: '/collections' },
  { labelKey: 'nav.products', href: '/products' },
  { labelKey: 'nav.brands', href: '/brands' },
  { labelKey: 'nav.newArrivals', href: '/products?sort=new' },
  { labelKey: 'nav.bestSellers', href: '/products?sort=best-selling' },
  { labelKey: 'nav.about', href: '/p/about-us' },
  { labelKey: 'nav.contact', href: '/contact' },
];

// Own array, not an alias of `primaryNav` — the footer's "Shop" column stays
// product-listing links only; `primaryNav`'s Categories/About/Contact entries
// would otherwise duplicate `footerAboutNav`/`footerHelpNav` below.
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
  { labelKey: 'nav.about', href: '/p/about-us' },
  { labelKey: 'footer.privacy', href: '/p/privacy-policy' },
  { labelKey: 'footer.terms', href: '/p/terms-of-service' },
];
