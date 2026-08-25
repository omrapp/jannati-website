'use client';

import { Button } from '@/components/ui/button';
import { deleteCustomer } from '../actions';

// Server Component (the detail page) can't import `../actions` directly for
// the same reason `DeleteBannerButton` can't — see that file's header. No
// `confirm()` dialog (unreliable in this stack, per this task's admin
// tooling convention) — the `destructive` variant plus the "Danger zone"
// framing on the page around this button is the distinct visual treatment
// standing in for a confirmation step.
export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  return (
    <form action={deleteCustomer.bind(null, customerId)}>
      <Button type="submit" variant="destructive">
        Delete customer permanently
      </Button>
    </form>
  );
}
