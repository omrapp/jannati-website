import { listCountries } from '@/lib/admin/countries';
import { createClient } from '@/lib/supabase/server';
import { CountrySettingsForm } from './country-settings-form';

export default async function AdminCountriesPage() {
  const client = await createClient();
  const countries = await listCountries(client);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Countries</h1>
        <p className="text-muted-foreground text-sm">
          FX rate, VAT, shipping, and enablement per country. Changes apply immediately — no deploy.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {countries.map((country) => (
          <CountrySettingsForm key={country.code} country={country} />
        ))}
      </div>
    </div>
  );
}
