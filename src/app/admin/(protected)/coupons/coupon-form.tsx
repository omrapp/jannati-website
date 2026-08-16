'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { idleCouponFormState, saveCoupon } from './actions';

export type CouponFormInitial = {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrderMinor: number | null;
  // `datetime-local` input value format (`YYYY-MM-DDTHH:mm`) — the stored
  // UTC instant sliced back to this shape, not converted; see `actions.ts`.
  startsAt: string;
  endsAt: string;
  usageLimit: number | null;
  perUserLimit: number | null;
  active: boolean;
};

export function CouponForm({ initial }: { initial: CouponFormInitial | null }) {
  const [state, formAction, pending] = useActionState(
    saveCoupon.bind(null, initial?.id ?? null),
    idleCouponFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" defaultValue={initial?.code} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            defaultValue={initial?.type ?? 'percent'}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="percent">Percent</option>
            <option value="fixed">Fixed (OMR minor units)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="value">Value</Label>
          <Input id="value" name="value" type="number" min="1" defaultValue={initial?.value} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="minOrderMinor">Minimum order (OMR minor units)</Label>
          <Input
            id="minOrderMinor"
            name="minOrderMinor"
            type="number"
            min="0"
            defaultValue={initial?.minOrderMinor ?? ''}
            placeholder="none"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="usageLimit">Total usage limit</Label>
          <Input
            id="usageLimit"
            name="usageLimit"
            type="number"
            min="1"
            defaultValue={initial?.usageLimit ?? ''}
            placeholder="unlimited"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="perUserLimit">Per-user limit</Label>
          <Input
            id="perUserLimit"
            name="perUserLimit"
            type="number"
            min="1"
            defaultValue={initial?.perUserLimit ?? ''}
            placeholder="unlimited"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startsAt">Starts at</Label>
          <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={initial?.startsAt} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endsAt">Ends at</Label>
          <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={initial?.endsAt} />
        </div>
      </div>

      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} />
        Active
      </label>

      {state.status === 'error' && <p className="text-destructive text-sm">{state.message}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save coupon'}
        </Button>
      </div>
    </form>
  );
}
