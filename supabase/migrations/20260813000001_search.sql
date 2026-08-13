-- Full-text search over products: Arabic and English tsvector columns,
-- trigram fuzzy fallback, and a ranked RPC the storefront calls directly.
--
-- Two vectors, not one: Arabic and English need different `to_tsvector`
-- configs ('simple' has no Arabic stemmer, 'english' does), and mixing both
-- languages into one vector would rank cross-language noise alongside real
-- matches. Postgres ships no Arabic stemmer at all, so `search_ar` only
-- tokenizes and de-duplicates whitespace/punctuation — relevance for Arabic
-- queries rests entirely on term + trigram matching, not stemming.

create extension if not exists pg_trgm;

alter table public.products
  add column search_ar tsvector,
  add column search_en tsvector;

create index products_search_ar_idx on public.products using gin (search_ar);
create index products_search_en_idx on public.products using gin (search_en);

-- Backing index for the similarity() fallback below; the expression must match
-- the one in search_products() or the planner won't use it.
create index products_name_trgm_idx
  on public.products
  using gin ((coalesce(name_ar, '') || ' ' || coalesce(name_en, '')) gin_trgm_ops);

-- Recomputes both vectors for one product row. A trigger, not a generated
-- column, because the brand name lives on another table and generated
-- columns can only reference the row being written.
create or replace function public.products_search_vector_update()
returns trigger
language plpgsql
as $$
declare
  brand_name_ar text;
  brand_name_en text;
begin
  select b.name_ar, b.name_en into brand_name_ar, brand_name_en
  from public.brands b
  where b.id = new.brand_id;

  new.search_ar :=
    setweight(to_tsvector('simple', coalesce(new.name_ar, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(brand_name_ar, brand_name_en, '')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(new.tags, ' ')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.description_ar, '')), 'D');

  new.search_en :=
    setweight(to_tsvector('english', coalesce(new.name_en, new.name_ar, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(brand_name_en, brand_name_ar, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(new.tags, ' ')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.description_en, '')), 'D');

  return new;
end;
$$;

create trigger products_search_vector_trigger
  before insert or update of name_ar, name_en, description_ar, description_en, tags, brand_id
  on public.products
  for each row execute function public.products_search_vector_update();

-- A brand rename must reach every one of its products' vectors, or a
-- re-branded line silently drops out of search under its new name. Touching
-- brand_id to its own value re-fires the trigger above without duplicating
-- its logic here.
create or replace function public.products_search_vector_refresh_for_brand()
returns trigger
language plpgsql
as $$
begin
  update public.products set brand_id = brand_id where brand_id = new.id;
  return new;
end;
$$;

create trigger brands_refresh_product_search
  after update of name_ar, name_en on public.brands
  for each row execute function public.products_search_vector_refresh_for_brand();

-- Backfill existing rows: the trigger only fires on future writes.
update public.products set brand_id = brand_id;

-- Ranked search. Returns every match, capped, rather than one page: paging a
-- number the caller also controls inside the function invites a request for
-- an oversized page_size to force Postgres to rank and return the whole
-- catalog in one response. The cap here is fixed and the caller cannot move
-- it; pagination happens in `src/lib/catalog/search.ts`, the same place the
-- total count comes from, so a page past the end reports its real total
-- instead of losing it along with the (correctly empty) row set.
--
-- Returns handles rather than full rows — the caller re-fetches with the
-- same joined columns every other listing uses, so one mapper
-- (`toProductSummary`) stays the single source of truth for what a product
-- card shows.
--
-- Trigram similarity is folded into the same rank via `greatest()`, at a
-- lower weight, so a misspelled query still surfaces close matches instead
-- of an empty page. There is no Arabic stemmer to lean on, so this ranking
-- is a starting point to be judged against real queries, not a guarantee.
create or replace function public.search_products(search_query text, search_language text)
returns table (handle text, rank real)
language sql
stable
as $$
  with query as (
    select
      case when search_language = 'ar'
        then websearch_to_tsquery('simple', search_query)
        else websearch_to_tsquery('english', search_query)
      end as tsq
  )
  select
    p.handle,
    greatest(
      ts_rank(
        case when search_language = 'ar' then p.search_ar else p.search_en end,
        query.tsq
      ),
      similarity(coalesce(p.name_ar, '') || ' ' || coalesce(p.name_en, ''), search_query) * 0.5
    ) as rank
  from public.products p, query
  where p.status = 'active'
    and (
      (case when search_language = 'ar' then p.search_ar else p.search_en end) @@ query.tsq
      or similarity(coalesce(p.name_ar, '') || ' ' || coalesce(p.name_en, ''), search_query) > 0.25
    )
  order by rank desc, handle asc
  -- Comfortably above the catalog size a "too broad" query could ever match;
  -- exists so a pathological query still costs one bounded query, not a scan
  -- returned in full.
  limit 500;
$$;

grant execute on function public.search_products(text, text) to anon, authenticated;
