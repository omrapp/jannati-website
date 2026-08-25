'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { blockCustomerCheckout, blockCustomerLogin, unblockCustomer } from '../actions';

type Props = {
  customerId: string;
  isLoginBlocked: boolean;
  isCheckoutBlocked: boolean;
  blockedReason: string | null;
};

// Server Component (the detail page) can't import `../actions` directly for
// the same reason `DeleteBannerButton` can't — see that file's header.
export function CustomerModerationControls({ customerId, isLoginBlocked, isCheckoutBlocked, blockedReason }: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Moderation</h2>
        <div className="flex gap-2">
          {isLoginBlocked && <Badge variant="destructive">Login blocked</Badge>}
          {isCheckoutBlocked && <Badge variant="destructive">Checkout blocked</Badge>}
          {!isLoginBlocked && !isCheckoutBlocked && <Badge variant="secondary">Clean</Badge>}
        </div>
      </div>

      {blockedReason && <p className="text-muted-foreground text-sm">Reason: {blockedReason}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {isLoginBlocked ? (
          <form action={unblockCustomer.bind(null, customerId, 'login')}>
            <Button type="submit" variant="outline">
              Unblock login
            </Button>
          </form>
        ) : (
          <form action={blockCustomerLogin.bind(null, customerId)} className="flex flex-1 gap-2">
            <Input name="reason" placeholder="Reason (optional)" className="max-w-xs" />
            <Button type="submit">Block login</Button>
          </form>
        )}

        {isCheckoutBlocked ? (
          <form action={unblockCustomer.bind(null, customerId, 'checkout')}>
            <Button type="submit" variant="outline">
              Unblock checkout
            </Button>
          </form>
        ) : (
          <form action={blockCustomerCheckout.bind(null, customerId)} className="flex flex-1 gap-2">
            <Input name="reason" placeholder="Reason (optional)" className="max-w-xs" />
            <Button type="submit">Block checkout</Button>
          </form>
        )}
      </div>

      {isLoginBlocked && isCheckoutBlocked && (
        <form action={unblockCustomer.bind(null, customerId, 'both')}>
          <Button type="submit" variant="ghost">
            Unblock all
          </Button>
        </form>
      )}
    </section>
  );
}
