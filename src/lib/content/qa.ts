/**
 * Turns a `content_pages.body_*` blob into Q&A pairs for the accordion
 * layout — used only by the three content pages that are actually
 * structured as heading/answer pairs (`faqs`, `shipping-policy`, `returns`;
 * see `QA_SLUGS`). Every other content page (about-us, privacy-policy,
 * terms-of-service) keeps rendering as flat prose, since their paragraph
 * counts per section vary and don't reduce to clean pairs.
 *
 * The convention this depends on: blank-line-separated blocks, alternating
 * heading then answer. `scripts/seed/content-pages.ts` is written to that
 * convention for the three qualifying slugs — see its header comment.
 */

/** Content pages whose body is heading/answer pairs, not flowing prose. */
export const QA_SLUGS = new Set(['faqs', 'shipping-policy', 'returns']);

export type QaPair = { question: string; answer: string };

/**
 * Splits on one-or-more blank lines, then pairs blocks two at a time. A
 * trailing unpaired block (malformed content — an edit that added a heading
 * with no answer yet) is dropped rather than rendered as a headless answer;
 * an incomplete FAQ entry is worse than a missing one.
 */
export function parseQaPairs(body: string): QaPair[] {
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  const pairs: QaPair[] = [];
  for (let i = 0; i + 1 < blocks.length; i += 2) {
    pairs.push({ question: blocks[i], answer: blocks[i + 1] });
  }

  return pairs;
}
