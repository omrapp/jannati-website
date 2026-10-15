'use client';

import Image from 'next/image';
import { useActionState, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { publicImageUrl } from '@/lib/catalog/mappers';
import {
  deleteProductImageAction,
  reorderProductImagesAction,
  updateProductImageAltAction,
  uploadProductImageAction,
  type ImageFormState,
} from './actions';

const idleImageFormState: ImageFormState = { status: 'idle' };

export type ProductImageRow = {
  id: string;
  storagePath: string;
  altAr: string | null;
  altEn: string | null;
  position: number;
};

// Server actions re-run `checkAdminAccess()` on every call — this component
// trusts nothing client-side, it just gives staff a UI over calls that are
// already gated server-side.
export function ProductImages({ productId, images }: { productId: string; images: ProductImageRow[] }) {
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadProductImageAction.bind(null, productId),
    idleImageFormState,
  );
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const ordered = [...images].sort((a, b) => a.position - b.position);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;

    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    startTransition(() => {
      reorderProductImagesAction(
        productId,
        next.map((img) => img.id),
      );
    });
  }

  function remove(imageId: string) {
    setPendingId(imageId);
    startTransition(async () => {
      await deleteProductImageAction(productId, imageId);
      setPendingId(null);
    });
  }

  function saveAlt(imageId: string, altAr: string, altEn: string) {
    setPendingId(imageId);
    startTransition(async () => {
      await updateProductImageAltAction(productId, imageId, {
        altAr: altAr.trim() || null,
        altEn: altEn.trim() || null,
      });
      setPendingId(null);
    });
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">Images</legend>

      <form action={uploadAction} className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="file">Upload image</Label>
          <input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
        </div>
        <Button type="submit" size="sm" disabled={uploadPending}>
          {uploadPending ? 'Uploading…' : 'Upload'}
        </Button>
      </form>
      {uploadState.status === 'error' && <p className="text-destructive text-sm">{uploadState.message}</p>}

      {ordered.length === 0 && <p className="text-muted-foreground text-sm">No images yet.</p>}

      <div className="flex flex-col gap-3">
        {ordered.map((image, index) => (
          <ImageRow
            key={image.id}
            image={image}
            isFirst={index === 0}
            isLast={index === ordered.length - 1}
            busy={pending && pendingId === image.id}
            onMoveUp={() => move(index, -1)}
            onMoveDown={() => move(index, 1)}
            onDelete={() => remove(image.id)}
            onSaveAlt={(altAr, altEn) => saveAlt(image.id, altAr, altEn)}
          />
        ))}
      </div>
    </fieldset>
  );
}

function ImageRow({
  image,
  isFirst,
  isLast,
  busy,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSaveAlt,
}: {
  image: ProductImageRow;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onSaveAlt: (altAr: string, altEn: string) => void;
}) {
  const [altAr, setAltAr] = useState(image.altAr ?? '');
  const [altEn, setAltEn] = useState(image.altEn ?? '');

  return (
    <div className="grid grid-cols-[80px_1fr_auto] items-center gap-3 rounded-md border p-3">
      <Image
        src={publicImageUrl(image.storagePath)}
        alt={image.altEn ?? image.altAr ?? ''}
        width={80}
        height={80}
        className="size-20 rounded object-cover"
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`image-${image.id}-alt-ar`}>Alt text (ar)</Label>
          <Input
            id={`image-${image.id}-alt-ar`}
            dir="rtl"
            value={altAr}
            onChange={(e) => setAltAr(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`image-${image.id}-alt-en`}>Alt text (en)</Label>
          <Input
            id={`image-${image.id}-alt-en`}
            value={altEn}
            onChange={(e) => setAltEn(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" disabled={isFirst || busy} onClick={onMoveUp}>
            Up
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={isLast || busy} onClick={onMoveDown}>
            Down
          </Button>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => onSaveAlt(altAr, altEn)}
        >
          Save alt text
        </Button>
        <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
