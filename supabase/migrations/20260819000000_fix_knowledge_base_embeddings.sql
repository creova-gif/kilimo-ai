-- KILIMO AI — fix knowledge_base.embedding dimension mismatch.
--
-- knowledge_base (20260527000000_ai_rag_notifications.sql) declared
-- `embedding vector(768)` per its own comment "Updated for Gemini
-- text-embedding-004", but supabase/functions/rag-chat/index.ts has always
-- generated embeddings with OpenAI's text-embedding-3-small, which is
-- 1536-dimensional — a hard dimension mismatch. Confirmed live (project
-- vwestumjbrpwlbsewupz): every row's `embedding` is NULL, and any call
-- that did produce a 1536-dim query vector would fail dimension
-- validation against the vector(768) column/function signature. rag-chat's
-- try/catch around the RPC call means this has always silently degraded
-- to the 8-row ILIKE keyword fallback — vector similarity search has never
-- actually run in production.
--
-- All rows currently have embedding = NULL, so there is no data to
-- preserve across the type change; drop and re-add rather than ALTER
-- COLUMN TYPE to sidestep any pgvector cast-compatibility edge cases.
drop index if exists public.knowledge_base_embedding_idx;

alter table public.knowledge_base
  drop column embedding;

alter table public.knowledge_base
  add column embedding vector(1536);

create index knowledge_base_embedding_idx
  on public.knowledge_base
  using hnsw (embedding vector_cosine_ops);

-- Lightweight geography extension: `region` already existed for
-- Tanzania-region tagging; `country` lets future non-Tanzania content
-- (flagged, not built yet — see PHASE 2 audit) live in the same table
-- without a schema rewrite. Defaults every existing/new row to Tanzania,
-- the only country this app currently serves.
alter table public.knowledge_base
  add column if not exists country text not null default 'TZ';

-- Recreate match_knowledge with the corrected vector(1536) signature.
-- Drop first rather than CREATE OR REPLACE: the argument's base type is
-- unchanged (vector) but this keeps the type change unambiguous.
drop function if exists public.match_knowledge(vector, float, int);

create function public.match_knowledge(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  content text,
  category text,
  similarity float
)
language sql stable
set search_path = public
as $$
  select
    knowledge_base.id,
    knowledge_base.title,
    knowledge_base.content,
    knowledge_base.category,
    1 - (knowledge_base.embedding <=> query_embedding) as similarity
  from knowledge_base
  where knowledge_base.embedding is not null
    and 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  order by knowledge_base.embedding <=> query_embedding
  limit match_count;
$$;
