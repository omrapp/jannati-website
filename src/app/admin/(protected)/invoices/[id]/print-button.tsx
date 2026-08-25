'use client';

import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Only client-side bit of the invoice page — `window.print()` needs a browser. */
export function PrintButton() {
  return (
    <Button type="button" size="sm" onClick={() => window.print()}>
      <Printer className="size-4" />
      Print
    </Button>
  );
}
