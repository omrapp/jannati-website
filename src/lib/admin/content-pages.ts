/**
 * Admin content page CRUD (Task 3.8). Cookie-bound client, same posture as
 * `taxonomy.ts` — `20260816000001_content.sql`'s "admins can manage content
 * pages" policy is the real gate.
 *
 * `slug` is immutable past creation (see the migration comment): the input
 * type below has no `slug` field on update, only on create, so there is no
 * code path that can send one.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/types';

export type ContentPage = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string | null;
  body_ar: string;
  body_en: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * `content_pages` doesn't exist in `Database` yet — this migration hasn't
 * been through `db:push`/`gen types`, same gap as `mark_fulfilment_status`
 * in `admin/orders.ts`. Same narrow extension instead of casting every call
 * to `any`; delete once the real migration lands in generated types.
 */
type DatabaseWithContentPages = Database & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      content_pages: {
        Row: ContentPage;
        Insert: Partial<ContentPage> & Pick<ContentPage, 'slug' | 'title_ar' | 'body_ar'>;
        Update: Partial<ContentPage>;
        Relationships: [];
      };
    };
  };
};

type Client = SupabaseClient<Database>;

function withContentPages(client: Client): SupabaseClient<DatabaseWithContentPages> {
  return client as unknown as SupabaseClient<DatabaseWithContentPages>;
}

const UNIQUE_VIOLATION = '23505';

export type ContentPageInput = {
  titleAr: string;
  titleEn: string | null;
  bodyAr: string;
  bodyEn: string | null;
  published: boolean;
};

export async function listContentPages(client: Client): Promise<ContentPage[]> {
  const { data, error } = await withContentPages(client).from('content_pages').select('*').order('slug');
  if (error) throw new Error(`listing content pages: ${error.message}`);
  return data;
}

export async function getContentPage(client: Client, id: string): Promise<ContentPage | null> {
  const { data, error } = await withContentPages(client)
    .from('content_pages')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`reading content page: ${error.message}`);
  return data;
}

export async function createContentPage(client: Client, slug: string, input: ContentPageInput): Promise<string> {
  const { data, error } = await withContentPages(client)
    .from('content_pages')
    .insert({
      slug,
      title_ar: input.titleAr,
      title_en: input.titleEn,
      body_ar: input.bodyAr,
      body_en: input.bodyEn,
      published: input.published,
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error(`Slug "${slug}" is already in use.`);
    throw new Error(`creating content page: ${error.message}`);
  }
  return data.id;
}

export async function updateContentPage(client: Client, id: string, input: ContentPageInput): Promise<void> {
  const { error } = await withContentPages(client)
    .from('content_pages')
    .update({
      title_ar: input.titleAr,
      title_en: input.titleEn,
      body_ar: input.bodyAr,
      body_en: input.bodyEn,
      published: input.published,
    })
    .eq('id', id);
  if (error) throw new Error(`updating content page: ${error.message}`);
}

/**
 * The storefront's own read (`/[locale]/p/[slug]`) — lives here rather than
 * `catalog/queries.ts` so the `content_pages`-doesn't-exist-in-`Database`-yet
 * workaround stays in one place instead of two. `.eq('published', true)`
 * does the same job the RLS policy already enforces for any client that
 * *isn't* going through `withContentPages`' service-bypassing cast, so a
 * draft page 404s for a shopper exactly like it would if RLS alone decided.
 */
export async function getPublishedContentPage(client: Client, slug: string): Promise<ContentPage | null> {
  const { data, error } = await withContentPages(client)
    .from('content_pages')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error) throw new Error(`reading content page ${slug}: ${error.message}`);
  return data;
}
