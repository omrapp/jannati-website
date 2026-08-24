'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Locale } from '@/i18n/config';

import { deleteAccountAction } from './actions';

/**
 * Type-to-confirm modal, no `Dialog`/`AlertDialog` primitive in
 * `components/ui` yet — a plain fixed overlay is the smallest thing that
 * works, same construction the pre-migration reference implementation used.
 */
export function DeleteAccount({ locale }: { locale: Locale }) {
  const t = useTranslations('auth.account.danger');
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setPhrase('');
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy]);

  const required = t('confirmPhrase');
  const canSubmit = phrase.trim() === required;

  async function onConfirm() {
    setBusy(true);
    setError(null);
    const result = await deleteAccountAction(locale);
    // A success redirects server-side and never returns here.
    setBusy(false);
    if (result.status === 'error') setError(result.message ?? t('error'));
  }

  return (
    <div className="border-destructive/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-destructive flex items-center gap-2 font-semibold">
          <AlertTriangle className="size-5" />
          {t('title')}
        </h2>
        <p className="text-muted-foreground max-w-md text-sm">{t('body')}</p>
      </div>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 />
        {t('delete')}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => {
              if (!busy) close();
            }}
          />
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="bg-background w-full max-w-md rounded-lg border p-6 shadow-xl">
              <div className="text-destructive mb-3 flex items-center gap-2">
                <AlertTriangle className="size-5" />
                <h2 className="text-lg font-semibold">{t('confirmTitle')}</h2>
              </div>
              <p className="text-muted-foreground mb-4 text-sm">{t('confirmBody')}</p>
              <div className="mb-4 flex flex-col gap-1.5">
                <Label htmlFor="delete-confirm">{t('typeToConfirm', { phrase: required })}</Label>
                <Input
                  id="delete-confirm"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              {error && (
                <p
                  role="alert"
                  className="border-destructive/40 bg-destructive/10 text-destructive mb-3 rounded-md border px-3 py-2 text-sm"
                >
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={close} disabled={busy}>
                  {t('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onConfirm}
                  disabled={!canSubmit || busy}
                >
                  {busy ? (
                    <>
                      <Loader2 className="animate-spin" />
                      {t('deleting')}
                    </>
                  ) : (
                    <>
                      <Trash2 />
                      {t('submit')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
