'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Country } from '@/lib/admin/countries';
import { saveCountrySettings, type CountrySettingsFormState } from './actions';

const idleCountrySettingsFormState: CountrySettingsFormState = { status: 'idle' };

export function CountrySettingsForm({ country }: { country: Country }) {
  const [state, formAction, pending] = useActionState(
    saveCountrySettings.bind(null, country.code),
    idleCountrySettingsFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          {country.name_en} ({country.code.toUpperCase()}) — {country.currency}
        </h2>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={country.enabled} />
          Enabled
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`fx-${country.code}`}>FX rate (from OMR)</Label>
          <Input
            id={`fx-${country.code}`}
            name="fxRateFromOmr"
            type="number"
            step="0.0001"
            min="0.0001"
            defaultValue={country.fx_rate_from_omr}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`rounding-${country.code}`}>Rounding step (minor units)</Label>
          <Input
            id={`rounding-${country.code}`}
            name="roundingStepMinor"
            type="number"
            step="1"
            min="1"
            defaultValue={country.rounding_step_minor}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`vat-${country.code}`}>VAT rate (0–0.99)</Label>
          <Input
            id={`vat-${country.code}`}
            name="vatRate"
            type="number"
            step="0.01"
            min="0"
            max="0.99"
            defaultValue={country.vat_rate}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`shipping-${country.code}`}>Flat shipping (minor units)</Label>
          <Input
            id={`shipping-${country.code}`}
            name="shippingFlatMinor"
            type="number"
            step="1"
            min="0"
            defaultValue={country.shipping_flat_minor}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`threshold-${country.code}`}>Free-shipping threshold (minor units)</Label>
          <Input
            id={`threshold-${country.code}`}
            name="freeShippingThresholdMinor"
            type="number"
            step="1"
            min="0"
            defaultValue={country.free_shipping_threshold_minor ?? ''}
            placeholder="none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        {state.status === 'error' && <p className="text-destructive text-sm">{state.message}</p>}
        {state.status === 'success' && <p className="text-sm text-emerald-600">{state.message}</p>}
      </div>
    </form>
  );
}
