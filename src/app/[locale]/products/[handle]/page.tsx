import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ProductGallery } from '@/components/commerce/product-gallery';
import { ReviewsSection } from '@/components/commerce/reviews-section';
import { VariantPicker } from '@/components/commerce/variant-picker';
import { WishlistButton } from '@/components/commerce/wishlist-button';
import { isLocale, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/navigation';
import { jsonLdScript, productJsonLd } from '@/lib/catalog/json-ld';
import { getCountry, getProductByHandle } from '@/lib/catalog/queries';
import { stripHtml } from '@/lib/catalog/text';
import { getApprovedReviews, getOwnReview, hasDeliveredPurchase } from '@/lib/commerce/reviews';
import { isWishlisted } from '@/lib/commerce/wishlist';
import { env } from '@/lib/env';
import { localeAlternates } from '@/lib/seo/alternates';
import { createClient, getAuthUser } from '@/lib/supabase/server';

type Params = Promise<{ locale: string; handle: string }>;

function canonicalUrl(locale: Locale, handle: string): string {
  return `${env.siteUrl}/${locale}/products/${encodeURIComponent(handle)}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, handle } = await params;
  if (!isLocale(locale)) return {};

  const product = await getProductByHandle(handle, locale);

  if (!product) return {};

  return {
    title: product.name,
    description: product.description ? stripHtml(product.description).slice(0, 160) : undefined,
    alternates: localeAlternates(locale, `/products/${encodeURIComponent(product.handle)}`),
    openGraph: {
      title: product.name,
      images: product.image ? [product.image.url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { locale, handle } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const [t, product, country] = await Promise.all([
    getTranslations('catalog'),
    getProductByHandle(handle, locale),
    getCountry(locale),
  ]);

  if (!product) notFound();

  const jsonLd = productJsonLd(product, {
    url: canonicalUrl(locale, product.handle),
    currency: country.currency,
    currencyExponent: country.currency_exponent,
  });

  const client = await createClient();
  const user = await getAuthUser();
  const [approvedReviews, ownReview, eligible, saved] = await Promise.all([
    getApprovedReviews(client, product.id),
    user ? getOwnReview(client, user.id, product.id) : Promise.resolve(null),
    user ? hasDeliveredPurchase(client, user.id, product.id) : Promise.resolve(false),
    user ? isWishlisted(client, user.id, product.id) : Promise.resolve(false),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <script
        type="application/ld+json"
        // Structured data has to reach the crawler in the HTML, not after hydration.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Keyed by handle: without it, React reuses the instance across a
            client-side navigation and the previous product's selected
            thumbnail and variant carry over. */}
        <ProductGallery key={product.handle} images={product.images} name={product.name} />

        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            {product.brand && (
              <Link
                href={`/brands/${product.brand.slug}`}
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
              >
                {product.brand.name}
              </Link>
            )}
            <h1 className="font-display text-3xl font-semibold">{product.name}</h1>
          </header>

          {product.variants.length > 0 ? (
            <VariantPicker key={product.handle} variants={product.variants} />
          ) : (
            <p className="text-muted-foreground">{t('priceOnRequest')}</p>
          )}

          <WishlistButton
            productId={product.id}
            handle={product.handle}
            signedIn={user !== null}
            initialSaved={saved}
          />

          {product.description && (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-medium">{t('description')}</h2>
              {/* Rendered as text, never as markup: the copy is scraped from a
                  third party today and staff-editable from /admin later, and
                  server-rendered HTML would execute a script on parse. */}
              <p className="text-muted-foreground text-sm whitespace-pre-line">
                {stripHtml(product.description)}
              </p>
            </section>
          )}
        </div>
      </div>

      <div className="mt-10 max-w-2xl">
        <ReviewsSection
          locale={locale}
          productId={product.id}
          handle={product.handle}
          approvedReviews={approvedReviews}
          eligible={eligible}
          ownReview={ownReview}
        />
      </div>
    </div>
  );
}
