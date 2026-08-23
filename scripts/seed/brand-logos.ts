/**
 * Uploads brand logos into Supabase Storage.
 *
 * The `brands` table already has `logo_path` set for every brand the scrape
 * found a logo for (written by `load.ts`, e.g. `brands/Abib.png`) — that step
 * never actually uploaded the file, so the path 404s until this runs. On-disk
 * mirror filenames keep their cache-busting query string (`Abib.png?v=...`),
 * so matching against the bare `logo_path` filename goes through
 * `widestCopy()`, same as product photos.
 *
 *   npm run seed:brand-logos -- --dry-run    # plan and projected size only
 *   npm run seed:brand-logos                 # upload, skipping what is already there
 *
 * Re-running is safe: existing objects are left alone. No DB write here — the
 * `logo_path` column is already correct, only the Storage object was missing.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { widestCopy } from './image-plan.ts';
import { contentType, storageClient } from './images.ts';

const BUCKET = 'product-images';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cdnFilesRoot = join(repoRoot, 'darbeauty.com', 'darbeauty.com', 'cdn', 'shop', 'files');

type BrandRow = { slug: string; logo_path: string };

type PlannedLogo = {
  slug: string;
  storagePath: string;
  localFile: string;
};

function humanBytes(bytes: number): string {
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

async function fetchBrandsWithLogo(): Promise<BrandRow[]> {
  const supabase = storageClient();
  const { data, error } = await supabase
    .from('brands')
    .select('slug, logo_path')
    .not('logo_path', 'is', null);

  if (error) throw new Error(`fetching brands: ${error.message}`);

  return data as BrandRow[];
}

function planLogos(brands: BrandRow[], localFiles: string[]) {
  const uploads: PlannedLogo[] = [];
  const missing: BrandRow[] = [];

  for (const brand of brands) {
    // logo_path is `brands/<bare filename>` — the bare name is the key
    // `widestCopy` matches local, query-stringed copies against.
    const bareFile = brand.logo_path.split('/').pop()!;
    const localFile = widestCopy(bareFile, localFiles);

    if (!localFile) {
      missing.push(brand);
      continue;
    }

    uploads.push({ slug: brand.slug, storagePath: brand.logo_path, localFile });
  }

  return { uploads, missing };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const brands = await fetchBrandsWithLogo();
  const localFiles = readdirSync(cdnFilesRoot);
  const { uploads, missing } = planLogos(brands, localFiles);
  const totalBytes = uploads.reduce(
    (total, upload) => total + statSync(join(cdnFilesRoot, upload.localFile)).size,
    0,
  );

  console.log(`logos to upload:   ${uploads.length}`);
  console.log(`projected size:    ${humanBytes(totalBytes)}`);
  console.log(`missing locally:   ${missing.length}`);

  for (const brand of missing) {
    console.warn(`  missing: ${brand.logo_path} (${brand.slug})`);
  }

  if (dryRun) {
    console.log('\ndry run — nothing uploaded');
    return;
  }

  const supabase = storageClient();
  let uploaded = 0;
  let skipped = 0;
  let bytes = 0;
  const failed: { path: string; message: string }[] = [];

  for (const upload of uploads) {
    const body = readFileSync(join(cdnFilesRoot, upload.localFile));
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(upload.storagePath, body, { contentType: contentType(upload.localFile) });

    if (error && !/exists/i.test(error.message)) {
      failed.push({ path: upload.storagePath, message: error.message });
      continue;
    }

    if (error) {
      skipped += 1;
      continue;
    }

    uploaded += 1;
    bytes += body.byteLength;
  }

  console.log(`\nuploaded ${uploaded} (${humanBytes(bytes)}), already present ${skipped}`);

  if (failed.length > 0) {
    console.error(`\n${failed.length} upload(s) failed:`);
    for (const failure of failed) {
      console.error(`  ${failure.path}: ${failure.message}`);
    }
    process.exitCode = 1;
  }
}

await main();
