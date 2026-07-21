create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  service_type text,
  description text,
  status text not null default 'draft',
  progress integer not null default 0,
  preview_url text,
  repository_url text,
  deadline date,
  approval_requested_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists client_id uuid references public.clients(id) on delete cascade,
  add column if not exists name text,
  add column if not exists service_type text,
  add column if not exists description text,
  add column if not exists status text not null default 'draft',
  add column if not exists progress integer not null default 0,
  add column if not exists preview_url text,
  add column if not exists repository_url text,
  add column if not exists deadline date,
  add column if not exists approval_requested_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_status_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_status_check
      check (
        status in (
          'draft',
          'in_progress',
          'internal_review',
          'awaiting_client_approval',
          'changes_requested',
          'approved',
          'completed',
          'cancelled'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_progress_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_progress_check
      check (progress >= 0 and progress <= 100);
  end if;
end $$;

create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  briefing_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  user_nome text,
  author_profile_id uuid references public.profiles(id) on delete set null,
  author_user_id uuid references auth.users(id) on delete set null,
  author_role text not null default 'client',
  comment_type text not null default 'message',
  message text,
  mensagem text,
  criado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.project_comments
  add column if not exists project_id uuid references public.projects(id) on delete cascade,
  add column if not exists client_id uuid references public.clients(id) on delete cascade,
  add column if not exists author_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists author_user_id uuid references auth.users(id) on delete set null,
  add column if not exists author_role text not null default 'client',
  add column if not exists comment_type text not null default 'message',
  add column if not exists message text,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_comments_author_role_check'
      and conrelid = 'public.project_comments'::regclass
  ) then
    alter table public.project_comments
      add constraint project_comments_author_role_check
      check (author_role in ('client', 'admin', 'system'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_comments_type_check'
      and conrelid = 'public.project_comments'::regclass
  ) then
    alter table public.project_comments
      add constraint project_comments_type_check
      check (comment_type in ('message', 'change_request', 'admin_response', 'approval'));
  end if;
end $$;

create index if not exists idx_projects_client_id on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_project_comments_project_id on public.project_comments(project_id);
create index if not exists idx_project_comments_client_id on public.project_comments(client_id);
create index if not exists idx_project_comments_created_at on public.project_comments(created_at);

create table if not exists public.project_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  email text,
  nome_arquivo text,
  caminho text,
  tipo text,
  tamanho bigint,
  storage_bucket text not null default 'project-files',
  storage_path text,
  criado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.project_uploads
  add column if not exists profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists client_id uuid references public.clients(id) on delete cascade,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists tamanho bigint,
  add column if not exists storage_bucket text not null default 'project-files',
  add column if not exists storage_path text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_project_uploads_client_id on public.project_uploads(client_id);
create index if not exists idx_project_uploads_project_id on public.project_uploads(project_id);

create or replace function public.set_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_projects_updated_at();

create or replace function public.prevent_project_client_protected_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_studio_admin() then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'authenticated user is required';
  end if;

  if not public.can_access_client(old.client_id) then
    raise exception 'project access denied';
  end if;

  if old.status <> 'awaiting_client_approval' then
    raise exception 'project is not awaiting client approval';
  end if;

  if new.status not in ('approved', 'changes_requested') then
    raise exception 'invalid client project status transition';
  end if;

  if old.client_id is distinct from new.client_id
    or old.name is distinct from new.name
    or old.service_type is distinct from new.service_type
    or old.description is distinct from new.description
    or old.progress is distinct from new.progress
    or old.preview_url is distinct from new.preview_url
    or old.repository_url is distinct from new.repository_url
    or old.deadline is distinct from new.deadline
    or old.approval_requested_at is distinct from new.approval_requested_at
    or old.created_at is distinct from new.created_at then
    raise exception 'client cannot update protected project fields';
  end if;

  if new.status = 'approved' then
    if old.approved_at is not null then
      raise exception 'project already approved';
    end if;

    new.approved_at = coalesce(new.approved_at, now());
    new.approved_by = coalesce(new.approved_by, auth.uid());
  else
    new.approved_at = old.approved_at;
    new.approved_by = old.approved_by;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_project_client_protected_update on public.projects;
create trigger prevent_project_client_protected_update
before update on public.projects
for each row
execute function public.prevent_project_client_protected_update();

create or replace function public.normalize_project_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_client_id uuid;
  v_profile_id uuid;
begin
  if new.project_id is not null then
    select client_id
    into v_project_client_id
    from public.projects
    where id = new.project_id;

    if v_project_client_id is null then
      raise exception 'project not found';
    end if;

    if new.client_id is null then
      new.client_id = v_project_client_id;
    end if;

    if new.client_id is distinct from v_project_client_id then
      raise exception 'comment client_id does not match project client_id';
    end if;
  end if;

  if auth.uid() is not null then
    new.author_user_id = coalesce(new.author_user_id, auth.uid());

    select id
    into v_profile_id
    from public.profiles
    where id = auth.uid();

    new.author_profile_id = coalesce(new.author_profile_id, v_profile_id);
  end if;

  new.message = coalesce(new.message, new.mensagem);
  new.mensagem = coalesce(new.mensagem, new.message);
  new.created_at = coalesce(new.created_at, new.criado_em, now());
  new.criado_em = coalesce(new.criado_em, new.created_at, now());

  return new;
end;
$$;

drop trigger if exists normalize_project_comment on public.project_comments;
create trigger normalize_project_comment
before insert or update on public.project_comments
for each row
execute function public.normalize_project_comment();

alter table public.projects enable row level security;
alter table public.project_comments enable row level security;
alter table public.project_uploads enable row level security;

drop policy if exists "projects_select_own_or_studio_admin" on public.projects;
create policy "projects_select_own_or_studio_admin"
on public.projects
for select
to authenticated
using (public.can_access_client(client_id));

drop policy if exists "projects_insert_studio_admin" on public.projects;
create policy "projects_insert_studio_admin"
on public.projects
for insert
to authenticated
with check (public.is_studio_admin());

drop policy if exists "projects_update_admin_or_client_approval" on public.projects;
create policy "projects_update_admin_or_client_approval"
on public.projects
for update
to authenticated
using (
  public.is_studio_admin()
  or (
    public.can_access_client(client_id)
    and status = 'awaiting_client_approval'
    and approved_at is null
  )
)
with check (
  public.is_studio_admin()
  or public.can_access_client(client_id)
);

drop policy if exists "project_comments_select_own_or_studio_admin" on public.project_comments;
create policy "project_comments_select_own_or_studio_admin"
on public.project_comments
for select
to authenticated
using (
  public.is_studio_admin()
  or public.can_access_client(client_id)
  or (
    project_id is null
    and user_id = auth.uid()
  )
);

drop policy if exists "project_comments_insert_own_or_studio_admin" on public.project_comments;
create policy "project_comments_insert_own_or_studio_admin"
on public.project_comments
for insert
to authenticated
with check (
  public.is_studio_admin()
  or (
    project_id is not null
    and public.can_access_client(client_id)
  )
);

drop policy if exists "audit_logs_insert_own_or_studio_admin" on public.audit_logs;
create policy "audit_logs_insert_own_or_studio_admin"
on public.audit_logs
for insert
to authenticated
with check (
  public.is_studio_admin()
  or public.can_access_client(client_id)
);

drop policy if exists "project_uploads_select_own_or_studio_admin" on public.project_uploads;
create policy "project_uploads_select_own_or_studio_admin"
on public.project_uploads
for select
to authenticated
using (public.can_access_client(client_id));

drop policy if exists "project_uploads_insert_own_or_studio_admin" on public.project_uploads;
create policy "project_uploads_insert_own_or_studio_admin"
on public.project_uploads
for insert
to authenticated
with check (public.can_access_client(client_id));

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do update
set public = false;

drop policy if exists "project_files_select_own_or_studio_admin" on storage.objects;
create policy "project_files_select_own_or_studio_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-files'
  and (
    public.is_studio_admin()
    or (
      (storage.foldername(name))[1] = 'clients'
      and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.can_access_client(((storage.foldername(name))[2])::uuid)
    )
  )
);

drop policy if exists "project_files_insert_own_or_studio_admin" on storage.objects;
create policy "project_files_insert_own_or_studio_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and (
    public.is_studio_admin()
    or (
      (storage.foldername(name))[1] = 'clients'
      and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.can_access_client(((storage.foldername(name))[2])::uuid)
    )
  )
);

drop policy if exists "project_files_delete_own_or_studio_admin" on storage.objects;
create policy "project_files_delete_own_or_studio_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-files'
  and (
    public.is_studio_admin()
    or (
      (storage.foldername(name))[1] = 'clients'
      and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.can_access_client(((storage.foldername(name))[2])::uuid)
    )
  )
);

create or replace function public.approve_studio_project(p_project_id uuid)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_profile public.profiles%rowtype;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'project not found';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if not found or v_profile.client_id is distinct from v_project.client_id then
    raise exception 'project access denied';
  end if;

  if v_project.status <> 'awaiting_client_approval' or v_project.approved_at is not null then
    raise exception 'project cannot be approved';
  end if;

  update public.projects
  set status = 'approved',
      approved_at = now(),
      approved_by = v_profile.id
  where id = p_project_id
  returning * into v_project;

  insert into public.project_comments (
    project_id,
    client_id,
    author_profile_id,
    author_user_id,
    author_role,
    comment_type,
    message
  ) values (
    v_project.id,
    v_project.client_id,
    v_profile.id,
    auth.uid(),
    'client',
    'approval',
    'Projeto aprovado pelo cliente.'
  );

  insert into public.audit_logs (
    actor_profile_id,
    client_id,
    entity_type,
    entity_id,
    action,
    new_data,
    metadata
  ) values (
    v_profile.id,
    v_project.client_id,
    'project',
    v_project.id,
    'project.approved',
    to_jsonb(v_project),
    jsonb_build_object('source', 'approve_studio_project')
  );

  return v_project;
end;
$$;

create or replace function public.request_studio_project_changes(
  p_project_id uuid,
  p_message text
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_profile public.profiles%rowtype;
  v_message text := nullif(trim(p_message), '');
begin
  if v_message is null then
    raise exception 'message is required';
  end if;

  select *
  into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'project not found';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if not found or v_profile.client_id is distinct from v_project.client_id then
    raise exception 'project access denied';
  end if;

  if v_project.status <> 'awaiting_client_approval' then
    raise exception 'project is not awaiting client approval';
  end if;

  update public.projects
  set status = 'changes_requested'
  where id = p_project_id
  returning * into v_project;

  insert into public.project_comments (
    project_id,
    client_id,
    author_profile_id,
    author_user_id,
    author_role,
    comment_type,
    message
  ) values (
    v_project.id,
    v_project.client_id,
    v_profile.id,
    auth.uid(),
    'client',
    'change_request',
    v_message
  );

  insert into public.audit_logs (
    actor_profile_id,
    client_id,
    entity_type,
    entity_id,
    action,
    new_data,
    metadata
  ) values (
    v_profile.id,
    v_project.client_id,
    'project',
    v_project.id,
    'project.changes_requested',
    jsonb_build_object('message', v_message),
    jsonb_build_object('source', 'request_studio_project_changes')
  );

  return v_project;
end;
$$;

grant select, insert, update on public.projects to authenticated;
grant select, insert, update on public.project_comments to authenticated;
grant select, insert, update on public.project_uploads to authenticated;
grant insert on public.audit_logs to authenticated;
grant execute on function public.approve_studio_project(uuid) to authenticated;
grant execute on function public.request_studio_project_changes(uuid, text) to authenticated;

comment on table public.projects is 'Projetos reais do DOZEDEV Studio, incluindo fluxo de homologacao e aprovacao do cliente.';
comment on table public.project_comments is 'Comentarios de projeto e registros de pedidos de alteracao. Campos legados de briefing permanecem para compatibilidade temporaria.';
