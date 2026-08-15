/**
 * Cash on delivery — the only provider that needs no external account, so
 * it's the one 2.9 ships. No redirect, no webhook: the shopper pays in
 * person when the courier hands over the package, which Phase 3 staff mark
 * by moving `fulfilment_status` (and `payment_status` to `paid`) from
 * `/admin`, not by anything this adapter does.
 */

import type { PaymentProvider } from './provider';

export const codProvider: PaymentProvider = {
  id: 'cod',

  async createPayment() {
    return { kind: 'immediate', status: 'pending' };
  },

  async handleWebhook() {
    throw new Error('cod has no webhook — nothing should ever call this');
  },
};
