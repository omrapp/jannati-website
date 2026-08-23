/**
 * Machine-translates products stuck at `en_translation_status = 'missing'`
 * into English. The 67 products with real scraped English copy are already
 * `machine`/`human` from `load.ts` and are never touched here — only rows
 * still `missing` are ever selected.
 *
 * Cost-gated (per project decision): this script never spends money on its
 * own. It always prints a plan + cost estimate first; nothing is translated
 * or written to the database unless `--run` is passed explicitly. Results
 * are cached to `data/translations.cache.json` (gitignored, like
 * `catalog.json`) keyed by product handle, so a re-run — including a
 * `--sample` review batch followed by the full run — never re-pays for a
 * product already translated.
 *
 * Uses the Vercel AI Gateway (`ai` package, plain `provider/model` string —
 * no direct provider SDK) — requires `AI_GATEWAY_API_KEY` in the
 * environment. Model + pricing below are the ones this script was written
 * against; verify current pricing before a real run, rates change.
 *
 *   npm run seed:translate -- --sample=10           # estimate only, 10-product sample
 *   npm run seed:translate -- --sample=10 --run      # translate 10, review quality/cost
 *   npm run seed:translate                           # estimate for the full ~958
 *   npm run seed:translate -- --run                  # translate + write everything missing
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateObject } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Cheapest Vercel AI Gateway model suitable for straightforward marketing-copy
// translation. Swap here if you'd rather use a different model for quality.
const MODEL = 'openai/gpt-4o-mini';

// USD per 1M tokens — gpt-4o-mini list pricing at time of writing. This is an
// ESTIMATE for planning purposes only; the gateway bills actual usage, which
// can differ from this formula's char/4 token approximation.
const COST_PER_1M_INPUT = 0.15;
const COST_PER_1M_OUTPUT = 0.6;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cachePath = join(repoRoot, 'data', 'translations.cache.json');

const translationSchema = z.object({
  nameEn: z.string().describe('English product name, natural for a beauty-retail storefront'),
  descriptionEn: z
    .string()
    .describe('English product description, same meaning and tone as the Arabic source'),
});

type CacheEntry = z.infer<typeof translationSchema>;
type Cache = Record<string, CacheEntry>;

type MissingProduct = {
  id: string;
  handle: string;
  name_ar: string;
  description_ar: string | null;
};

function flag(name: string): string | null {
  const arg = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : null;
}

function loadCache(): Cache {
  try {
    return JSON.parse(readFileSync(cachePath, 'utf8')) as Cache;
  } catch {
    return {};
  }
}

function saveCache(cache: Cache): void {
  writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

/** Service-role client: translation status is a staff-level write. */
function supabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local',
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

/** char/4 is a rough token approximation — good enough to size a budget, not to bill against. */
function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

async function translateProduct(product: MissingProduct): Promise<CacheEntry> {
  const { object } = await generateObject({
    model: MODEL,
    schema: translationSchema,
    prompt: [
      'Translate this beauty-product listing from Arabic to English.',
      'Keep it natural for an e-commerce storefront, not a literal word-for-word translation.',
      'Preserve brand names, ingredient names, and product-line names as-is.',
      '',
      `Name (Arabic): ${product.name_ar}`,
      `Description (Arabic): ${product.description_ar ?? ''}`,
    ].join('\n'),
  });

  return object;
}

async function main(): Promise<void> {
  const run = process.argv.includes('--run');
  const sample = flag('sample') ? Number(flag('sample')) : undefined;

  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, handle, name_ar, description_ar')
    .eq('en_translation_status', 'missing');

  if (error) throw new Error(`fetching products: ${error.message}`);

  const missing = data as MissingProduct[];
  const cache = loadCache();
  const cached = missing.filter((product) => cache[product.handle]);
  const uncached = missing.filter((product) => !cache[product.handle]);
  const batch = sample ? uncached.slice(0, sample) : uncached;

  const totalChars = batch.reduce(
    (total, product) => total + product.name_ar.length + (product.description_ar?.length ?? 0),
    0,
  );
  const inputTokens = estimateTokens(totalChars);
  // Output is a translation of comparable length to the source.
  const outputTokens = inputTokens;
  const estimatedCost =
    (inputTokens / 1_000_000) * COST_PER_1M_INPUT + (outputTokens / 1_000_000) * COST_PER_1M_OUTPUT;

  console.log(`products missing English:  ${missing.length}`);
  console.log(`already in cache (free):   ${cached.length}`);
  console.log(`this run will translate:   ${batch.length}`);
  console.log(`estimated input tokens:    ~${inputTokens.toLocaleString()}`);
  console.log(`estimated output tokens:   ~${outputTokens.toLocaleString()}`);
  console.log(`estimated cost:            ~$${estimatedCost.toFixed(4)} (${MODEL}, approximate)`);

  if (!run) {
    console.log('\nestimate only — pass --run to actually translate. Nothing written.');
    return;
  }

  let translated = 0;
  const failed: { handle: string; message: string }[] = [];

  for (const product of batch) {
    try {
      cache[product.handle] = await translateProduct(product);
      translated += 1;
      if (translated % 50 === 0) console.log(`  translated ${translated}/${batch.length}…`);
    } catch (error) {
      failed.push({ handle: product.handle, message: String(error) });
    }
  }

  saveCache(cache);

  // Write every product that has a cache entry now — covers this run's
  // fresh translations plus any that were already cached from a prior run.
  const toWrite = [...cached, ...batch].filter((product) => cache[product.handle]);
  let written = 0;

  for (const product of toWrite) {
    const entry = cache[product.handle];
    const { error: updateError } = await supabase
      .from('products')
      .update({
        name_en: entry.nameEn,
        description_en: entry.descriptionEn,
        en_translation_status: 'machine',
      })
      .eq('id', product.id);

    if (updateError) {
      failed.push({ handle: product.handle, message: updateError.message });
      continue;
    }

    written += 1;
  }

  console.log(`\ntranslated ${translated}, wrote ${written} row(s) to the database`);

  if (failed.length > 0) {
    console.error(`\n${failed.length} failure(s):`);
    for (const failure of failed.slice(0, 20)) {
      console.error(`  ${failure.handle}: ${failure.message}`);
    }
    process.exitCode = 1;
  }
}

await main();
