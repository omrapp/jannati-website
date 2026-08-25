import Image from 'next/image';

/**
 * Storefront-styled preview of a content page, fed straight from
 * `ContentPageForm`'s live React state. Mirrors
 * `app/[locale]/p/[slug]/page.tsx`'s hero + article layout at slide-over
 * width. Body renders as plain `whitespace-pre-wrap` text — same convention
 * the storefront page itself uses — never `dangerouslySetInnerHTML`.
 */
export function ContentPagePreview({
  title,
  body,
  heroImageUrl,
}: {
  title: string;
  body: string;
  heroImageUrl: string;
}) {
  const displayTitle = title.trim() || 'Untitled page';
  const trimmedHero = heroImageUrl.trim();

  return (
    <div className="flex flex-col">
      {trimmedHero ? (
        <div className="relative h-40 w-full overflow-hidden rounded-lg sm:h-52">
          <Image
            src={trimmedHero}
            alt={displayTitle}
            fill
            sizes="400px"
            className="object-cover"
          />
          <div className="from-background/90 via-background/30 absolute inset-0 bg-gradient-to-t to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="flex w-full flex-col gap-2 p-4">
              <span className="bg-primary h-1 w-10 rounded-full" />
              <h1 className="font-display text-xl font-semibold">{displayTitle}</h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span className="bg-primary h-1 w-10 rounded-full" />
          <h1 className="font-display text-xl font-semibold">{displayTitle}</h1>
        </div>
      )}

      <article className="flex flex-col gap-4 py-6">
        <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
          {body.trim() || 'No body content yet.'}
        </div>
      </article>
    </div>
  );
}
