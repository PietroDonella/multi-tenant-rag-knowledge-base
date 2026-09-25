-- Multi-tenant RAG knowledge base.
-- Membership lives in organization_users. Authorization helpers live in the
-- private schema as security definer functions so policies do not recurse
-- through RLS on organization_users. Data-plane RPCs stay security invoker
-- so Postgres still applies RLS for the calling user.

create extension if not exists vector with schema extensions;
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  created_by uuid not null default auth.uid() references auth.users (id)
);

create table public.organization_users (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  primary key (org_id, user_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  filename text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  content text not null,
  embedding extensions.vector(1536)
);

create index organization_users_user_id_idx
  on public.organization_users (user_id);

create index documents_org_id_created_at_idx
  on public.documents (org_id, created_at desc);

create index document_chunks_org_id_idx
  on public.document_chunks (org_id);

create index document_chunks_document_id_idx
  on public.document_chunks (document_id);

create index document_chunks_embedding_idx
  on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Authorization helpers (private schema, not exposed by the Data API)
-- ---------------------------------------------------------------------------

create or replace function private.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_users
    where org_id = target_org
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.has_org_role(target_org uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_users
    where org_id = target_org
      and user_id = (select auth.uid())
      and role = any (allowed_roles)
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;
revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.has_org_role(uuid, text[]) from public;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;

-- The creator of an organization becomes its owner. Runs as the function
-- owner so the membership row is written even though the user is not yet a member.
create or replace function private.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_users (org_id, user_id, role)
  values (new.id, (select auth.uid()), 'owner');
  return new;
end;
$$;

create trigger organizations_assign_owner
  after insert on public.organizations
  for each row
  execute function private.handle_new_organization();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.organization_users enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

create policy organizations_select
  on public.organizations
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or private.is_org_member(id)
  );

create policy organizations_insert
  on public.organizations
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy organizations_update
  on public.organizations
  for update
  to authenticated
  using (private.has_org_role(id, array['owner', 'admin']))
  with check (private.has_org_role(id, array['owner', 'admin']));

create policy organizations_delete
  on public.organizations
  for delete
  to authenticated
  using (private.has_org_role(id, array['owner']));

create policy organization_users_select
  on public.organization_users
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_org_member(org_id)
  );

create policy organization_users_insert
  on public.organization_users
  for insert
  to authenticated
  with check (private.has_org_role(org_id, array['owner', 'admin']));

create policy organization_users_update
  on public.organization_users
  for update
  to authenticated
  using (private.has_org_role(org_id, array['owner', 'admin']))
  with check (private.has_org_role(org_id, array['owner', 'admin']));

create policy organization_users_delete
  on public.organization_users
  for delete
  to authenticated
  using (private.has_org_role(org_id, array['owner', 'admin']));

create policy documents_select
  on public.documents
  for select
  to authenticated
  using (private.is_org_member(org_id));

create policy documents_insert
  on public.documents
  for insert
  to authenticated
  with check (private.is_org_member(org_id));

create policy documents_update
  on public.documents
  for update
  to authenticated
  using (private.is_org_member(org_id))
  with check (private.is_org_member(org_id));

create policy documents_delete
  on public.documents
  for delete
  to authenticated
  using (private.is_org_member(org_id));

create policy document_chunks_select
  on public.document_chunks
  for select
  to authenticated
  using (private.is_org_member(org_id));

create policy document_chunks_insert
  on public.document_chunks
  for insert
  to authenticated
  with check (private.is_org_member(org_id));

create policy document_chunks_update
  on public.document_chunks
  for update
  to authenticated
  using (private.is_org_member(org_id))
  with check (private.is_org_member(org_id));

create policy document_chunks_delete
  on public.document_chunks
  for delete
  to authenticated
  using (private.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- Similarity search. Security invoker: RLS on document_chunks still applies.
-- The explicit org filter keeps a user who belongs to several tenants inside
-- the organization they selected.
-- ---------------------------------------------------------------------------

create or replace function public.match_document_chunks(
  query_embedding extensions.vector(1536),
  match_org_id uuid,
  match_count integer default 8
)
returns table (
  id uuid,
  document_id uuid,
  org_id uuid,
  content text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    dc.id,
    dc.document_id,
    dc.org_id,
    dc.content,
    1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.document_chunks as dc
  where dc.org_id = match_org_id
    and private.is_org_member(match_org_id)
    and dc.embedding is not null
  order by dc.embedding OPERATOR(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

revoke all on function public.match_document_chunks(extensions.vector, uuid, integer) from public;
grant execute on function public.match_document_chunks(extensions.vector, uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage. Object path: {org_id}/{document_id}/{filename}
-- Upsert needs select + insert + update.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy documents_storage_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documents'
    and private.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy documents_storage_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and private.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy documents_storage_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'documents'
    and private.is_org_member((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'documents'
    and private.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy documents_storage_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and private.is_org_member((storage.foldername(name))[1]::uuid)
  );
