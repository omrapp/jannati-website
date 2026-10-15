'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { checkAdminAccess } from '@/lib/admin/auth';
import { createCoupon, updateCoupon, type CouponInput } from '@/lib/admin/coupons';
import { createAdminClient } from '@/lib/supabase/admin';

// Matches the `coupons_code_check`-adjacent `code = upper(code)` constraint
// — letters/digits/hyphens only, kept in sync by hand like `SLUG_RE` in the
// brands admin action.
const CODE_RE = /^[a-z0-9-]+$/i;

const couponSchema = z.object({
  code: z.string().trim().regex(CODE_RE, 'letters, numbers, hyphens only'),
  type: z.enum(['percent', 'fixed']),
  value: z.coerce.number().int().positive(),
  minOrderMinor: z.coerce.number().int().nonnegative().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  usageLimit: z.coerce.number().int().positive().nullable(),
  perUserLimit: z.coerce.number().int().positive().nullable(),
  active: z.boolean(),
});

export type CouponFormState = { status: 'idle' | 'error'; message?: string };

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s.length > 0 ? s : null;
}

// `<input type="datetime-local">` has no timezone of its own. Treated as UTC
// on the way in (`Z` appended) and sliced back to the same `YYYY-MM-DDTHH:mm`
// shape on the way out (`CouponForm`'s `initial.startsAt`/`endsAt`) — staff
// see and type the same UTC wall-clock value both directions, no
// browser-timezone conversion to drift on repeated edits.
function toIsoOrNull(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(`${value}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function saveCoupon(
  couponId: string | null,
  _prevState: CouponFormState,
  formData: FormData,
): Promise<CouponFormState> {
  const access = await checkAdminAccess();
  if (!access.isAdmin) return { status: 'error', message: 'Not authorized.' };

  const parsed = couponSchema.safeParse({
    code: formData.get('code'),
    type: formData.get('type'),
    value: formData.get('value'),
    minOrderMinor: emptyToNull(formData.get('minOrderMinor')),
    startsAt: toIsoOrNull(emptyToNull(formData.get('startsAt'))),
    endsAt: toIsoOrNull(emptyToNull(formData.get('endsAt'))),
    usageLimit: emptyToNull(formData.get('usageLimit')),
    perUserLimit: emptyToNull(formData.get('perUserLimit')),
    active: formData.get('active') === 'on',
  });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const input: CouponInput = parsed.data;

  try {
    const admin = createAdminClient();
    if (couponId) {
      await updateCoupon(admin, couponId, input);
    } else {
      await createCoupon(admin, input);
    }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Save failed.' };
  }

  redirect('/admin/coupons');
}
