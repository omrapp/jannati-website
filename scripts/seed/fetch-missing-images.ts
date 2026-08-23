/**
 * Downloads the product photos the scrape linked to but never mirrored
 * locally (lazy-loaded gallery shots the crawler's HTML pass never fetched).
 * darbeauty.com is a sister/partner brand — this pulls directly from its own
 * CDN, at a deliberately slow, sequential pace out of courtesy to a live
 * third-party site, not this project's infra.
 *
 * Requires `catalog.json` to carry `sourceUrl` per image, i.e. a re-run of
 * `npm run seed:extract` after the `sourceUrl` field was added — older
 * snapshots are reported as "no source URL", not silently skipped.
 *
 *   npm run seed:fetch-images -- --dry-run          # list what would fetch, no network
 *   npm run seed:fetch-images -- --dry-run --limit=20   # sample of the plan
 *   npm run seed:fetch-images -- --limit=20          # fetch a small batch for review
 *   npm run seed:fetch-images                        # fetch everything missing
 *
 * Saved without the CDN query string — `image-plan.ts`'s `widestCopy` treats
 * a copy with no `?width=` parameter as the original, so it always outranks
 * any narrower rendition already on disk, and `npm run seed:images` picks it
 * up on the next run unmodified.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

import { planUploads, type LocalFiles, type MissingImage } from './image-plan.ts';
import type { Catalog } from './types.ts';

const DEFAULT_DELAY_MS = 250;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cdnRoot = join(repoRoot, 'darbeauty.com', 'darbeauty.com', 'cdn', 'shop');
const catalogPath = join(repoRoot, 'data', 'catalog.json');

function flag(name: string): string | null {
  const arg = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : null;
}

function localFiles(): LocalFiles {
  return {
    files: readdirSync(join(cdnRoot, 'files')),
    products: readdirSync(join(cdnRoot, 'products')),
  };
}

/** One entry per distinct missing file — several products can share a photo. */
function dedupe(missing: MissingImage[]): MissingImage[] {
  const seen = new Set<string>();
  const unique: MissingImage[] = [];

  for (const image of missing) {
    const key = `${image.folder}/${image.file}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(image);
  }

  return unique;
}

function humanBytes(bytes: number): string {
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const limit = flag('limit') ? Number(flag('limit')) : undefined;
  const delayMs = flag('delay') ? Number(flag('delay')) : DEFAULT_DELAY_MS;

  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as Catalog;
  const plan = planUploads(catalog.products, localFiles());
  const missing = dedupe(plan.missing);

  const withSource = missing.filter((image) => image.sourceUrl);
  const noSource = missing.filter((image) => !image.sourceUrl);
  const batch = limit ? withSource.slice(0, limit) : withSource;

  console.log(`missing locally:      ${missing.length}`);
  console.log(`fetchable (has URL):  ${withSource.length}`);
  console.log(`no source URL:        ${noSource.length}`);
  if (noSource.length > 0) {
    console.warn('  re-run `npm run seed:extract` to populate sourceUrl, then retry');
  }
  console.log(`this run will fetch:  ${batch.length}`);

  if (dryRun) {
    for (const image of batch.slice(0, 10)) {
      console.log(`  would fetch: ${image.sourceUrl}`);
    }
    console.log('\ndry run — nothing fetched');
    return;
  }

  let fetched = 0;
  let failed = 0;
  let bytes = 0;
  const failures: { url: string; reason: string }[] = [];

  for (const image of batch) {
    const destDir = join(cdnRoot, image.folder);
    const destPath = join(destDir, image.file);

    try {
      const response = await fetch(image.sourceUrl!);
      if (!response.ok) {
        failures.push({ url: image.sourceUrl!, reason: `HTTP ${response.status}` });
        failed += 1;
      } else {
        const body = Buffer.from(await response.arrayBuffer());
        mkdirSync(destDir, { recursive: true });
        writeFileSync(destPath, body);
        bytes += body.byteLength;
        fetched += 1;
      }
    } catch (error) {
      failures.push({ url: image.sourceUrl!, reason: String(error) });
      failed += 1;
    }

    if ((fetched + failed) % 100 === 0) {
      console.log(`  progress: ${fetched + failed}/${batch.length}`);
    }

    await sleep(delayMs);
  }

  console.log(`\nfetched ${fetched} (${humanBytes(bytes)}), failed ${failed}`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} failure(s):`);
    for (const failure of failures.slice(0, 20)) {
      console.error(`  ${failure.reason}: ${failure.url}`);
    }
    process.exitCode = 1;
  }

  console.log('\nnext: npm run seed:images -- --dry-run   (to size the upload)');
}

await main();
