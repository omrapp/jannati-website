import { notFound } from 'next/navigation';

import { getCoupon } from '@/lib/admin/coupons';
import { createAdminClient } from '@/lib/supabase/admin';
import { CouponForm } from '../coupon-form';

// Stored UTC instant -> `datetime-local` input shape. See `actions.ts` for
// the reverse direction; both sides treat the wall-clock digits as UTC, no
// timezone conversion.
function toLocalInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 16) : '';
}

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const coupon = await getCoupon(admin, id);
  if (!coupon) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{coupon.code}</h1>
      <CouponForm
        initial={{
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minOrderMinor: coupon.min_order_minor,
          startsAt: toLocalInputValue(coupon.starts_at),
          endsAt: toLocalInputValue(coupon.ends_at),
          usageLimit: coupon.usage_limit,
          perUserLimit: coupon.per_user_limit,
          active: coupon.active,
        }}
      />
    </div>
  );
}
