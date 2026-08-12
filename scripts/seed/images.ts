/**
 * Uploads the scraped product imagery into Supabase Storage and records the
 * resulting keys back into `data/catalog.json`.
 *
 * Only the widest rendition of each photo is uploaded — see `image-plan.ts`.
 * The mapping is worked out first and printed, so the transfer size is known
 * before a single byte moves:
 *
 *   npm run seed:images -- --dry-run    # plan and projected size only
 *   npm run seed:images                 # upload, skipping what is already there
 *
 * Re-running is safe: existing objects are left alone.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

import { planUploads, type LocalFiles, type PlannedUpload } from './image-plan.ts';
import type { Catalog } from './types.ts';

const BUCKET = 'product-images';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cdnRoot = join(repoRoot, 'darbeauty.com', 'darbeauty.com', 'cdn', 'shop');
const catalogPath = join(repoRoot, 'data', 'catalog.json');

function localFiles(): LocalFiles {
  return {
    files: readdirSync(join(cdnRoot, 'files')),
    products: readdirSync(join(cdnRoot, 'products')),
  };
}

function sizeOf(upload: PlannedUpload): number {
  return statSync(join(cdnRoot, upload.folder, upload.localFile)).size;
}

function humanBytes(bytes: number): string {
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function contentType(file: string): string {
  const extension = file.split('?')[0].split('.').pop()?.toLowerCase();

  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';

  return 'image/jpeg';
}

/** Service-role client: uploading to Storage is a staff-level write. */
function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local',
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as Catalog;
  const plan = planUploads(catalog.products, localFiles());
  const totalBytes = plan.uploads.reduce((total, upload) => total + sizeOf(upload), 0);

  console.log(`images to upload:  ${plan.uploads.length}`);
  console.log(`projected size:    ${humanBytes(totalBytes)}`);
  console.log(`missing locally:   ${plan.missing.length}`);

  for (const missing of plan.missing.slice(0, 10)) {
    console.warn(`  missing: ${missing.folder}/${missing.file} (${missing.handle})`);
  }

  if (dryRun) {
    console.log('\ndry run — nothing uploaded, catalog untouched');
    return;
  }

  const supabase = storageClient();
  let uploaded = 0;
  let skipped = 0;
  let bytes = 0;

  for (const upload of plan.uploads) {
    const body = readFileSync(join(cdnRoot, upload.folder, upload.localFile));
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(upload.storagePath, body, { contentType: contentType(upload.localFile) });

    // Already there from an earlier run: leave it, count it as done.
    if (error && !/exists/i.test(error.message)) {
      throw new Error(`upload failed for ${upload.storagePath}: ${error.message}`);
    }

    if (error) {
      skipped += 1;
      continue;
    }

    uploaded += 1;
    bytes += body.byteLength;

    if (uploaded % 200 === 0) console.log(`  uploaded ${uploaded}…`);
  }

  // Record the keys so the loader writes storage paths, never darbeauty URLs.
  const keys = new Map(
    plan.uploads.map((upload) => [`${upload.handle}#${upload.position}`, upload.storagePath]),
  );

  for (const product of catalog.products) {
    for (const image of product.images) {
      image.storagePath = keys.get(`${product.handle}#${image.position}`) ?? null;
    }
  }

  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

  console.log(`\nuploaded ${uploaded} (${humanBytes(bytes)}), already present ${skipped}`);
  console.log(`catalog updated with storage paths: ${catalogPath}`);
}

await main();
