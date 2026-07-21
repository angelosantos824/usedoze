alter table public.projects
  add column if not exists briefing_id uuid references public.briefings(id) on delete set null;

create unique index if not exists projects_briefing_id_unique
on public.projects(briefing_id)
where briefing_id is not null;

create index if not exists idx_projects_briefing_id on public.projects(briefing_id);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text not null,
  progress integer,
  status text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_updates
  add column if not exists project_id uuid references public.projects(id) on delete cascade,
  add column if not exists client_id uuid references public.clients(id) on delete cascade,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists progress integer,
  add column if not exists status text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_updates_progress_check'
      and conrelid = 'public.project_updates'::regclass
  ) then
    alter table public.project_updates
      add constraint project_updates_progress_check
      check (progress is null or (progress >= 0 and progress <= 100));
  end if;
end $$;

create index if not exists idx_project_updates_project_id
on public.project_updates(project_id);

create index if not exists idx_project_updates_client_id
on public.project_updates(client_id);

create index if not exists idx_project_updates_created_at
on public.project_updates(created_at desc);

create or replace function public.set_project_updates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_project_updates_updated_at on public.project_updates;
create trigger set_project_updates_updated_at
before update on public.project_updates
for each row
execute function public.set_project_updates_updated_at();

create or replace function public.normalize_project_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
begin
  select *
  into v_project
  from public.projects
  where id = new.project_id;

  if not found then
    raise exception 'project not found';
  end if;

  if new.client_id is null then
    new.client_id = v_project.client_id;
  end if;

  if new.client_id is distinct from v_project.client_id then
    raise exception 'project_update client_id does not match project client_id';
  end if;

  new.created_by = coalesce(new.created_by, auth.uid());
  new.created_at = coalesce(new.created_at, now());
  new.updated_at = coalesce(new.updated_at, now());

  return new;
end;
$$;

drop trigger if exists normalize_project_update on public.project_updates;
create trigger normalize_project_update
before insert or update on public.project_updates
for each row
execute function public.normalize_project_update();

alter table public.project_updates enable row level security;

drop policy if exists "project_updates_select_own_or_studio_admin" on public.project_updates;
create policy "project_updates_select_own_or_studio_admin"
on public.project_updates
for select
to authenticated
using (
  public.is_studio_admin()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.client_id = project_updates.client_id
  )
);

drop policy if exists "project_updates_insert_studio_admin" on public.project_updates;
create policy "project_updates_insert_studio_admin"
on public.project_updates
for insert
to authenticated
with check (public.is_studio_admin());

drop policy if exists "project_updates_update_studio_admin" on public.project_updates;
create policy "project_updates_update_studio_admin"
on public.project_updates
for update
to authenticated
using (public.is_studio_admin())
with check (public.is_studio_admin());

drop policy if exists "project_updates_delete_studio_admin" on public.project_updates;
create policy "project_updates_delete_studio_admin"
on public.project_updates
for delete
to authenticated
using (public.is_studio_admin());

grant select, insert, update, delete on public.project_updates to authenticated;

comment on column public.projects.briefing_id is 'Briefing original convertido em projeto real do DOZEDEV Studio.';
comment on table public.project_updates is 'Atualizacoes administrativas visiveis ao cliente para acompanhamento de projetos reais.';
