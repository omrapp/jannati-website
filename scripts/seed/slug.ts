/**
 * Slug derivation for seed data.
 *
 * Only 55 of the vendors on darbeauty have a card on the brands index, so the
 * rest need a slug derived from the vendor name the product itself carries.
 */

/**
 * `AXIS-Y` -> `axis-y`, `Dr. Jart+` -> `dr-jart`.
 *
 * Null when nothing sluggable survives — an Arabic-only or punctuation-only
 * vendor would otherwise collapse to an empty slug and merge unrelated brands.
 */
export function brandSlug(vendor: string): string | null {
  const slug = vendor
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || null;
}
