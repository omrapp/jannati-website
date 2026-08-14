/**
 * A `?next=` query param is attacker-controllable (it rides along with the
 * form submission, all the way into the server action's arguments) — an
 * unchecked value could redirect a freshly-authenticated shopper straight to
 * an external phishing page. Only ever follow a same-origin, relative path.
 */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}
