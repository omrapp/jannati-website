'use client';

import { Button } from '@/components/ui/button';
import { deleteBannerAction } from './actions';

// A Server Component can't import `../actions` directly — every export of a
// `'use server'` file must be an async function, and `idleBannerFormState`
// (an object, for `BannerForm`'s `useActionState`) isn't one. Routing the
// delete call through a client component sidesteps that, same as
// `ProductImages` does for `deleteProductImageAction`.
export function DeleteBannerButton({ bannerId }: { bannerId: string }) {
  return (
    <form action={deleteBannerAction.bind(null, bannerId)}>
      <Button type="submit" variant="destructive">
        Delete
      </Button>
    </form>
  );
}
