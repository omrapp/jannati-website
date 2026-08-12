/**
 * Product copy is scraped third-party HTML, and the same column becomes
 * staff-editable in the admin panel later — so it is never trusted as markup.
 * Everything that renders or indexes a description goes through here first.
 */

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/** Tags out, entities decoded, whitespace collapsed. Returns plain text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, ' ')
    .trim();
}
