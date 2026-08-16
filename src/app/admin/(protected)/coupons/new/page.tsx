import { CouponForm } from '../coupon-form';

export default function NewCouponPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">New coupon</h1>
      <CouponForm initial={null} />
    </div>
  );
}
