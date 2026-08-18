import type { SiteSettings } from '@/lib/admin/site-settings';

/**
 * Brand glyphs as inline SVGs, not a dependency — `lucide-react` v1 dropped
 * every brand/social icon, and there's no `react-icons`/`simple-icons`
 * install in the repo. Adding one for six fixed, never-changing glyphs would
 * be a heavier fix than five small `d` paths. Path data follows the Simple
 * Icons project (CC0), 24×24 viewBox, `fill="currentColor"` so each inherits
 * the surrounding text color like every other icon in the header/footer.
 */
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 1.987-.287 1.68h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647z" />
    </svg>
  );
}

function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.001 2C6.478 2 2 6.478 2 12c0 1.803.474 3.516 1.375 5.023L2 22l5.106-1.34A9.945 9.945 0 0 0 12.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm5.454 14.146c-.229.646-1.336 1.234-1.848 1.31-.472.07-1.07.1-1.727-.108-.398-.126-.909-.293-1.564-.573-2.752-1.188-4.549-3.951-4.687-4.134-.137-.183-1.119-1.489-1.119-2.84 0-1.35.71-2.014.962-2.29.252-.276.55-.345.733-.345.183 0 .367.002.527.01.169.008.396-.064.619.472.229.549.779 1.897.848 2.035.069.138.115.3.023.484-.092.183-.138.298-.275.459-.138.16-.29.358-.414.481-.138.137-.281.286-.121.561.16.276.712 1.174 1.528 1.902 1.05.937 1.936 1.227 2.211 1.365.276.138.436.114.596-.069.16-.183.687-.802.871-1.077.183-.276.367-.23.619-.138.252.092 1.599.755 1.874.893.276.138.459.207.527.322.069.115.069.663-.16 1.31z" />
    </svg>
  );
}

type SocialPlatform = {
  key: keyof Pick<
    SiteSettings,
    'instagram_url' | 'facebook_url' | 'tiktok_url' | 'x_url' | 'youtube_url'
  >;
  Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  labelKey: 'social.instagram' | 'social.facebook' | 'social.tiktok' | 'social.x' | 'social.youtube';
};

const PLATFORMS: SocialPlatform[] = [
  { key: 'instagram_url', Icon: InstagramIcon, labelKey: 'social.instagram' },
  { key: 'facebook_url', Icon: FacebookIcon, labelKey: 'social.facebook' },
  { key: 'tiktok_url', Icon: TikTokIcon, labelKey: 'social.tiktok' },
  { key: 'x_url', Icon: XIcon, labelKey: 'social.x' },
  { key: 'youtube_url', Icon: YoutubeIcon, labelKey: 'social.youtube' },
];

/** `wa.me` deep link — WhatsApp has no web "profile URL" of its own, just a
 * chat-open link built from the phone number with non-digits stripped. */
export function whatsAppLink(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

/**
 * Renders only the platforms with a URL set — an icon for an unset link
 * would be a dead click, so it's simply not in the list rather than
 * disabled/greyed. Every icon is an `<a>`, never a `div`/`span` with an
 * `onClick`, per the keyboard-reachability convention from Task 4.6.
 */
export function SocialIcons({
  settings,
  t,
  className,
  iconClassName,
}: {
  settings: SiteSettings;
  t: (key: string) => string;
  className?: string;
  iconClassName?: string;
}) {
  const links = PLATFORMS.filter((p) => settings[p.key]).map((p) => ({
    ...p,
    href: settings[p.key] as string,
  }));

  const whatsapp = settings.whatsapp_show && settings.whatsapp ? whatsAppLink(settings.whatsapp) : null;

  if (links.length === 0 && !whatsapp) return null;

  return (
    <ul className={className}>
      {links.map(({ key, Icon, labelKey, href }) => (
        <li key={key}>
          <a href={href} target="_blank" rel="noreferrer noopener" aria-label={t(labelKey)}>
            <Icon className={iconClassName ?? 'text-muted-foreground hover:text-foreground size-4 transition-colors'} />
          </a>
        </li>
      ))}
      {whatsapp && (
        <li>
          <a href={whatsapp} target="_blank" rel="noreferrer noopener" aria-label={t('social.whatsapp')}>
            <WhatsAppIcon
              className={iconClassName ?? 'text-muted-foreground hover:text-foreground size-4 transition-colors'}
            />
          </a>
        </li>
      )}
    </ul>
  );
}
