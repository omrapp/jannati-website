/**
 * A `?next=` query param is attacker-controllable (it rides along with the
 * form submission, all the way into the server action's arguments) — an
 * unchecked value could redirect a freshly-authenticated shopper straight to
 * an external phishing page. Only ever follow a same-origin, relative path.
 *
 * A plain `startsWith('/')` string check isn't enough: `new URL()` (which is
 * what actually consumes this value downstream, e.g. the auth callback
 * route) normalizes backslashes to forward slashes and strips tabs/newlines
 * *before* parsing, so something like `/\evil.example` — which passes a
 * naive prefix check — resolves to `//evil.example`, a protocol-relative URL
 * pointing at a different host. Route the value through `URL` ourselves and
 * compare origins, so we reject exactly what the browser would treat as
 * off-origin, instead of guessing at the character blocklist.
 */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/')) return '/';

  const placeholder = 'http://placeholder.invalid';
  let url: URL;
  try {
    url = new URL(next, placeholder);
  } catch {
    return '/';
  }

  if (url.origin !== placeholder) return '/';
  return `${url.pathname}${url.search}${url.hash}`;
}
