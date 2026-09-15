-- =============================================================================
-- TrustAgent AI — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- =============================================================================

-- 1. Enable pgvector -----------------------------------------------------
create extension if not exists vector;

-- 2. documents: uploaded security policy PDFs (the knowledge base) ------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,                 -- multi-tenant scoping
  uploaded_by uuid references auth.users(id),
  file_name text not null,
  storage_path text not null,           -- path inside the Supabase Storage bucket
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists documents_org_id_idx on documents (org_id);

-- 3. document_chunks: embedded chunks of each policy --------------------
-- vector(768) matches text-embedding-004's output dimensionality.
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  org_id uuid not null,                 -- denormalized onto the chunk for fast, simple filtering
  chunk_index int not null,
  content text not null,
  embedding vector(768) not null,
  metadata jsonb not null default '{}'::jsonb,   -- e.g. { "page": 4, "section": "Access Control" }
  created_at timestamptz not null default now()
);

create index if not exists document_chunks_document_id_idx on document_chunks (document_id);
create index if not exists document_chunks_org_id_idx on document_chunks (org_id);

-- Approximate nearest-neighbor index for cosine similarity search.
-- IVFFlat can be created before rows exist; run `analyze document_chunks;`
-- after your first bulk ingest so the query planner uses it effectively.
create index if not exists document_chunks_embedding_idx
  on document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. questionnaires: one row per uploaded .xlsx --------------------------
create table if not exists questionnaires (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  uploaded_by uuid references auth.users(id),
  file_name text not null,
  storage_path text,                    -- path to the original uploaded .xlsx, so export can
                                         -- write answers back into the same layout
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists questionnaires_org_id_idx on questionnaires (org_id);

-- 5. questionnaire_items: one row per question ---------------------------
create table if not exists questionnaire_items (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references questionnaires (id) on delete cascade,
  row_index int not null,               -- original spreadsheet row, so export preserves order
  question text not null,
  ai_answer text,                       -- what Gemini generated
  final_answer text,                    -- what actually gets exported (set on approve/edit)
  sources jsonb not null default '[]'::jsonb,  -- [{ "chunkId": "...", "similarity": 0.87 }, ...]
  confidence text check (confidence in ('high', 'medium', 'low')),
  status text not null default 'pending'
    check (status in ('pending', 'answered', 'approved', 'edited', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists questionnaire_items_questionnaire_id_idx
  on questionnaire_items (questionnaire_id);

-- Keep updated_at current on every edit.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists questionnaire_items_set_updated_at on questionnaire_items;
create trigger questionnaire_items_set_updated_at
  before update on questionnaire_items
  for each row execute function set_updated_at();

-- 6. Similarity search RPC -------------------------------------------------
-- Called from the RAG retrieval step (see lib/ai/rag/answerQuestion.ts).
create or replace function match_document_chunks(
  query_embedding vector(768),
  match_org_id uuid,
  match_count int default 3
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where document_chunks.org_id = match_org_id
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- 7. Row Level Security ----------------------------------------------------
-- Assumes org_id is attached to the caller's JWT as a custom claim
-- (e.g. via a Supabase Auth hook reading a `profiles.org_id` column).
-- Server-side ingestion/processing routes should use the service role key,
-- which bypasses RLS — these policies protect direct client-side reads.
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table questionnaires enable row level security;
alter table questionnaire_items enable row level security;

create policy "org members can read their documents"
  on documents for select
  using (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org members can insert their documents"
  on documents for insert
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org members can read their chunks"
  on document_chunks for select
  using (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org members can read their questionnaires"
  on questionnaires for select
  using (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org members can insert their questionnaires"
  on questionnaires for insert
  with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy "org members can read their questionnaire items"
  on questionnaire_items for select
  using (
    exists (
      select 1 from questionnaires q
      where q.id = questionnaire_items.questionnaire_id
        and q.org_id = (auth.jwt() ->> 'org_id')::uuid
    )
  );

create policy "org members can update their questionnaire items"
  on questionnaire_items for update
  using (
    exists (
      select 1 from questionnaires q
      where q.id = questionnaire_items.questionnaire_id
        and q.org_id = (auth.jwt() ->> 'org_id')::uuid
    )
  );

-- Server routes use the service role key and must retain table privileges even
-- when row level security is enabled. These grants are safe because the key
-- is server-only and never exposed to the browser.
grant usage on schema public to service_role;
grant all on table documents, document_chunks, questionnaires, questionnaire_items to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function match_document_chunks(vector, uuid, int) to service_role;
