import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { majorDecimalToMinor, minorToDecimalString, OMR_EXPONENT } from '@/lib/commerce/money';

export type ProductPreviewStatus = 'draft' | 'active' | 'archived';

const STATUS_BADGE_VARIANT: Record<ProductPreviewStatus, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  draft: 'secondary',
  archived: 'outline',
};

/**
 * Storefront-styled summary card fed straight from `ProductForm`'s live
 * React state — mirrors `components/commerce/product-card.tsx`'s visual
 * language (aspect-square image tile, name, price) so staff get a rough
 * "what the customer will roughly see" preview, not a full PDP clone: no
 * variant picker or reviews, since those compose against persisted data
 * that doesn't exist for a product mid-edit.
 *
 * Text-only rendering throughout — plain JSX text nodes, no
 * `dangerouslySetInnerHTML` — same convention the storefront itself uses
 * for product/content-page copy.
 */
export function ProductPreviewCard({
  name,
  priceMajor,
  status,
  description,
  image,
}: {
  name: string;
  priceMajor: string;
  status: ProductPreviewStatus;
  description: string;
  image?: { url: string; alt: string } | null;
}) {
  const priceMinor = majorDecimalToMinor(priceMajor, OMR_EXPONENT);
  const price = priceMinor !== null ? `${minorToDecimalString(priceMinor, OMR_EXPONENT)} OMR` : null;
  const displayName = name.trim() || 'Untitled product';

  return (
    <div className="mx-auto flex w-full max-w-xs flex-col gap-3">
      <div className="bg-secondary/40 relative aspect-square overflow-hidden rounded-lg">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || displayName}
            fill
            sizes="320px"
            className="object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
            No image
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium">{displayName}</h3>
          <Badge variant={STATUS_BADGE_VARIANT[status]} className="shrink-0 capitalize">
            {status}
          </Badge>
        </div>

        <span className="text-primary font-semibold">
          {price ?? <span className="text-muted-foreground text-sm">Price on request</span>}
        </span>
      </div>

      {description.trim() && (
        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
          {description}
        </p>
      )}
    </div>
  );
}
