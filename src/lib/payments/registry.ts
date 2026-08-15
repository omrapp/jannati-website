import { codProvider } from './cod';
import type { PaymentProvider, PaymentProviderId } from './provider';
import { tapProvider } from './tap';
import { thawaniProvider } from './thawani';

/**
 * Registered here, but neither is selectable at checkout yet — `cod.ts` is
 * still the only `paymentProvider` value `placeOrder` (`checkout/actions.ts`)
 * writes. Registering ahead of that wiring means the registry, and the
 * webhook routes that call `getPaymentProvider('thawani'|'tap')`, are ready
 * the moment 2.11/2.12 are unblocked and checkout UI adds the option — no
 * change needed here or in `orders.ts` when that happens.
 */
const providers: Partial<Record<PaymentProviderId, PaymentProvider>> = {
  cod: codProvider,
  thawani: thawaniProvider,
  tap: tapProvider,
};

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  const provider = providers[id];
  if (!provider) throw new Error(`no payment provider registered for "${id}"`);

  return provider;
}
