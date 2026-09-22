-- KILIMO AI — keyless retrieval for the RAG knowledge base (KIL-009).
--
-- WHY: public.knowledge_base has a vector(768) `embedding` column, but every
-- row's embedding is NULL until a provider key exists and
-- scripts/embed-knowledge.ts is run. match_knowledge() therefore returns
-- nothing today, and rag-chat's only other path was an ILIKE scan. This adds a
-- real Postgres full-text index so rag-chat can return the most relevant
-- passages with NO paid key at all; vector search is still used first whenever
-- embeddings exist.
--
-- Additive + idempotent: a generated column, a GIN index and one function.
-- No data is inserted or changed (the 8 seeded rows are untouched).

-- 1. Generated full-text vector. Title weighs most (A), then content (B), then
--    category (C). The 'simple' (no stemming, no stop words) copy lets
--    non-English terms — e.g. Swahili words or product names — still match
--    exactly. Literal ::regconfig keeps the expression immutable, as a
--    generated column requires.
alter table public.knowledge_base
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(content, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, replace(coalesce(category, ''), '_', ' ')), 'C') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(content, '')), 'D')
  ) stored;

create index if not exists knowledge_base_search_tsv_idx
  on public.knowledge_base using gin (search_tsv);

-- 2. search_knowledge(query, lang, n): best-matching passages, most relevant
--    first. Words are OR-ed (a farmer's natural question rarely contains every
--    word of a passage) and ranked with ts_rank_cd, so passages matching more /
--    rarer / title words come first. `lang = 'sw'` skips the English stemmer
--    (it would mangle Swahili words) and matches on the exact-word index only.
--
--    SECURITY INVOKER: it runs with the caller's rights, so knowledge_base's
--    RLS (enabled, default-deny for clients) and grants apply unchanged. Only
--    service_role (the rag-chat edge function) can execute it — same contract
--    as match_knowledge.
create or replace function public.search_knowledge(query text, lang text default 'en', n int default 3)
returns table (id uuid, title text, content text, category text, rank real)
language sql
stable
security invoker
set search_path = public
as $$
  with terms as (
    select
      nullif(replace(plainto_tsquery('english'::regconfig, coalesce(query, ''))::text, ' & ', ' | '), '') as en_q,
      nullif(replace(plainto_tsquery('simple'::regconfig, coalesce(query, ''))::text, ' & ', ' | '), '') as simple_q
  ),
  q as (
    select case
      when lang = 'sw' then simple_q::tsquery
      when en_q is null then simple_q::tsquery
      when simple_q is null then en_q::tsquery
      else en_q::tsquery || simple_q::tsquery
    end as tsq
    from terms
  )
  select kb.id, kb.title, kb.content, kb.category,
         ts_rank_cd(kb.search_tsv, q.tsq)::real as rank
  from public.knowledge_base kb, q
  where q.tsq is not null
    and kb.search_tsv @@ q.tsq
  order by rank desc, kb.title asc
  limit greatest(1, least(coalesce(n, 3), 10));
$$;

comment on function public.search_knowledge(text, text, int) is
  'Keyless full-text retrieval over knowledge_base for rag-chat. Security invoker; service_role only.';

-- 3. Grants — follows 20260920000000_explicit_api_grants.sql: no client
--    access to knowledge_base or its RPCs; service_role only.
revoke all on function public.search_knowledge(text, text, int) from public, anon, authenticated;
grant execute on function public.search_knowledge(text, text, int) to service_role;
