-- Profile fields and organization presentation details.
-- Membership lookup by e-mail stays in the private schema.

alter table public.organizations
  add column if not exists description text,
  add column if not exists location text,
  add column if not exists avatar_url text,
  add column if not exists banner_url text;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text
);

insert into public.profiles (id, display_name)
select id, split_part(email, '@', 1)
from auth.users
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'organization_users_profile_fkey'
  ) then
    alter table public.organization_users
      add constraint organization_users_profile_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
end $$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(coalesce(new.email, ''), '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_for_new_user on auth.users;
create trigger profiles_for_new_user
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

grant select, update on public.profiles to authenticated;

alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.organization_users as mine
      join public.organization_users as theirs on theirs.org_id = mine.org_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = profiles.id
    )
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists organization_users_leave on public.organization_users;
create policy organization_users_leave
  on public.organization_users
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and role <> 'owner'
  );

drop policy if exists organizations_update on public.organizations;
create policy organizations_update
  on public.organizations
  for update
  to authenticated
  using (private.has_org_role(id, array['owner']))
  with check (private.has_org_role(id, array['owner']));

create or replace function private.user_id_by_email(target_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from auth.users
  where lower(email) = lower(btrim(target_email))
  limit 1;
$$;

revoke all on function private.user_id_by_email(text) from public;
grant execute on function private.user_id_by_email(text) to authenticated;

create or replace function public.add_organization_member(target_org uuid, member_email text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  member_id uuid;
begin
  if not private.has_org_role(target_org, array['owner']) then
    raise exception 'Somente o dono pode adicionar participantes.';
  end if;

  member_id := private.user_id_by_email(member_email);
  if member_id is null then
    raise exception 'Nenhuma conta encontrada com esse e-mail.';
  end if;

  if exists (
    select 1
    from public.organization_users
    where org_id = target_org
      and user_id = member_id
  ) then
    raise exception 'Essa pessoa já participa da organização.';
  end if;

  insert into public.organization_users (org_id, user_id, role)
  values (target_org, member_id, 'member');
end;
$$;

revoke all on function public.add_organization_member(uuid, text) from public;
grant execute on function public.add_organization_member(uuid, text) to authenticated;

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists media_select on storage.objects;
create policy media_select
  on storage.objects
  for select
  to public
  using (bucket_id = 'media');

drop policy if exists media_insert on storage.objects;
create policy media_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and (
      (
        (storage.foldername(name))[1] = 'users'
        and (storage.foldername(name))[2] = (select auth.uid())::text
      )
      or (
        (storage.foldername(name))[1] = 'orgs'
        and private.has_org_role(((storage.foldername(name))[2])::uuid, array['owner'])
      )
    )
  );

drop policy if exists media_update on storage.objects;
create policy media_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'media'
    and (
      (
        (storage.foldername(name))[1] = 'users'
        and (storage.foldername(name))[2] = (select auth.uid())::text
      )
      or (
        (storage.foldername(name))[1] = 'orgs'
        and private.has_org_role(((storage.foldername(name))[2])::uuid, array['owner'])
      )
    )
  )
  with check (
    bucket_id = 'media'
    and (
      (
        (storage.foldername(name))[1] = 'users'
        and (storage.foldername(name))[2] = (select auth.uid())::text
      )
      or (
        (storage.foldername(name))[1] = 'orgs'
        and private.has_org_role(((storage.foldername(name))[2])::uuid, array['owner'])
      )
    )
  );

drop policy if exists media_delete on storage.objects;
create policy media_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'media'
    and (
      (
        (storage.foldername(name))[1] = 'users'
        and (storage.foldername(name))[2] = (select auth.uid())::text
      )
      or (
        (storage.foldername(name))[1] = 'orgs'
        and private.has_org_role(((storage.foldername(name))[2])::uuid, array['owner'])
      )
    )
  );
