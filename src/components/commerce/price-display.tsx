import { cn } from '@/lib/utils';

/**
 * Prices arrive already converted and formatted for the active country — this
 * only decides how they look. No money maths lives in a component.
 */
export function PriceDisplay({
  price,
  compareAtPrice,
  fallback,
  className,
}: {
  price: string | null;
  compareAtPrice?: string | null;
  /** Shown when a product has no priced variant. */
  fallback: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline gap-3', className)}>
      {price ? (
        <span className="text-primary text-2xl font-semibold">{price}</span>
      ) : (
        <span className="text-muted-foreground">{fallback}</span>
      )}
      {compareAtPrice && (
        <span className="text-muted-foreground text-sm line-through">{compareAtPrice}</span>
      )}
    </div>
  );
}
