/**
 * Works out which local file backs each catalog image and where it belongs in
 * Storage. Pure — no filesystem, no network — so the whole mapping is testable
 * without touching the 422MB scrape or a Supabase project.
 *
 * The scrape mirrored every Shopify rendition as its own file, e.g.
 * `photo.webp?v=1764340237&width=200` … `&width=1080`. Only the widest is worth
 * uploading; Next.js resizes from there.
 */

import { createHash } from 'node:crypto';

import type { ParsedImage, ParsedProduct } from './types.ts';

export type PlannedUpload = {
  /** Product and position the key was derived from, so it can be written back. */
  handle: string;
  position: number;
  folder: ParsedImage['folder'];
  /** Filename inside `cdn/shop/<folder>`, query string and all. */
  localFile: string;
  storagePath: string;
};

export type MissingImage = {
  handle: string;
  file: string;
  folder: ParsedImage['folder'];
  /** Absent when the catalog snapshot predates the `sourceUrl` field. */
  sourceUrl?: string;
};

export type UploadPlan = {
  uploads: PlannedUpload[];
  missing: MissingImage[];
};

/** Filenames present in the scrape, keyed by the folder that holds them. */
export type LocalFiles = Record<ParsedImage['folder'], string[]>;

function widthOf(fileName: string): number {
  const match = fileName.match(/[?&]width=(\d+)/);

  // A copy with no width parameter is the original, so it beats every rendition.
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function baseNameOf(fileName: string): string {
  return fileName.split('?')[0];
}

/**
 * Content hash of a file's bytes, keyed against `storagePath` by callers to
 * skip re-uploading a file that has not changed since a previous run — on
 * top of, not instead of, the per-product storage-path scheme above (each
 * product still keeps its own copy even when it shares bytes with another).
 */
export function sha1Hex(bytes: Uint8Array): string {
  return createHash('sha1').update(bytes).digest('hex');
}

/** The largest rendition of `file` among `candidates`, or null if absent. */
export function widestCopy(file: string, candidates: string[]): string | null {
  let best: string | null = null;

  for (const candidate of candidates) {
    if (baseNameOf(candidate) !== file) continue;
    if (!best || widthOf(candidate) > widthOf(best)) best = candidate;
  }

  return best;
}

/**
 * Storage keys are ascii-only: the upload of
 * `centellian24-360º-shot-pdrn-glowing-eye-patch` is rejected outright, and
 * Arabic handles — which the catalog allows, because the storefront is Arabic
 * first — would fare no better.
 *
 * Handles that are already safe pass through unchanged so a re-run recognises
 * files uploaded by an earlier one. The rest are folded to ascii and given a
 * hash of the original, because folding alone collapses two Arabic handles onto
 * the same key.
 */
export function storageFolder(handle: string): string {
  if (/^[a-z0-9_-]+$/.test(handle)) return handle;

  const ascii = handle
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  const hash = createHash('sha1').update(handle).digest('hex').slice(0, 8);

  return `${ascii || 'product'}-${hash}`;
}

/**
 * `<handle>/<NN>-<slugified filename>`.
 *
 * Keyed by product rather than by source filename so one product's imagery can
 * be replaced or removed without touching another's, even when both reference
 * the same photo.
 */
export function storagePath(handle: string, position: number, file: string): string {
  const extension = file.slice(file.lastIndexOf('.')).toLowerCase();
  const name = file
    .slice(0, file.lastIndexOf('.'))
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${storageFolder(handle)}/${String(position).padStart(2, '0')}-${name}${extension}`;
}

export function planUploads(products: ParsedProduct[], local: LocalFiles): UploadPlan {
  const uploads: PlannedUpload[] = [];
  const missing: MissingImage[] = [];

  for (const product of products) {
    for (const image of product.images) {
      const localFile = widestCopy(image.file, local[image.folder]);

      if (!localFile) {
        missing.push({
          handle: product.handle,
          file: image.file,
          folder: image.folder,
          sourceUrl: image.sourceUrl,
        });
        continue;
      }

      uploads.push({
        handle: product.handle,
        position: image.position,
        folder: image.folder,
        localFile,
        storagePath: storagePath(product.handle, image.position, image.file),
      });
    }
  }

  return { uploads, missing };
}
