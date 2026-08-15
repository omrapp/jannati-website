'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';

import { AddressForm } from '@/components/commerce/address-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/config';
import type { Address } from '@/lib/commerce/addresses';

import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
} from '@/app/[locale]/account/addresses/actions';

/**
 * Owns which card is mid-edit and whether the "add address" form is open —
 * both client-only UI state, nothing money- or stock-related, so this is the
 * one piece of the address book that doesn't need to be a Server Component.
 * The list itself (`addresses`) is server-fetched and passed down; every
 * mutation round-trips through a Server Action and `revalidatePath`, same as
 * the cart drawer, so there's no local cache to keep in sync.
 */
export function AddressList({ addresses, locale }: { addresses: Address[]; locale: Locale }) {
  const t = useTranslations('addresses');
  const tCountry = useTranslations('country');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function remove(addressId: string) {
    if (!window.confirm(t('deleteConfirm'))) return;
    const formData = new FormData();
    formData.set('addressId', addressId);
    startTransition(() => {
      void deleteAddressAction(formData);
    });
  }

  function makeDefault(addressId: string) {
    const formData = new FormData();
    formData.set('addressId', addressId);
    startTransition(() => {
      void setDefaultAddressAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {addresses.length === 0 && !isAdding && (
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      )}

      <ul className="flex flex-col gap-3">
        {addresses.map((address) => (
          <li key={address.id} className="rounded-md border p-4">
            {editingId === address.id ? (
              <AddressForm
                address={address}
                action={updateAddressAction.bind(null, locale, address.id)}
                onSaved={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    {address.full_name}
                    {address.is_default && <Badge variant="secondary">{t('default')}</Badge>}
                  </div>
                  <span className="text-muted-foreground">{address.phone}</span>
                  <span className="text-muted-foreground">
                    {address.line1}
                    {address.area ? `, ${address.area}` : ''}, {address.city},{' '}
                    {tCountry(address.country_code)}
                  </span>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(address.id)}>
                      {t('edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => remove(address.id)}
                    >
                      {t('delete')}
                    </Button>
                  </div>
                  {!address.is_default && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      disabled={isPending}
                      onClick={() => makeDefault(address.id)}
                    >
                      {t('setDefault')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {isAdding ? (
        <AddressForm
          action={createAddressAction.bind(null, locale)}
          onSaved={() => setIsAdding(false)}
          onCancel={() => setIsAdding(false)}
          className="rounded-md border p-4"
        />
      ) : (
        <Button variant="outline" onClick={() => setIsAdding(true)} className="self-start">
          <Plus />
          {t('addNew')}
        </Button>
      )}
    </div>
  );
}
