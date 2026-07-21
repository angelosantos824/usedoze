create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists client_id uuid,
  add column if not exists updated_at timestamptz not null default now();

alter table public.clients
  add column if not exists origin text not null default 'studio';

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  ip inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_client_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_client_id_fkey
      foreign key (client_id)
      references public.clients(id)
      on delete set null;
  end if;

end $$;

create index if not exists idx_profiles_client_id on public.profiles(client_id);
create index if not exists idx_profiles_email_normalized on public.profiles(lower(trim(email))) where email is not null;
create index if not exists idx_clients_email_normalized on public.clients(lower(trim(email))) where email is not null;
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_client_occurred_at on public.audit_logs(client_id, occurred_at desc);
create index if not exists idx_audit_logs_actor_occurred_at on public.audit_logs(actor_profile_id, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_profile_protected_field_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.allow_profile_protected_update', true) = 'on' then
    return new;
  end if;

  if old.id is distinct from new.id then
    raise exception 'profile id cannot be changed';
  end if;

  if old.role is distinct from new.role then
    raise exception 'profile role cannot be changed directly';
  end if;

  if old.client_id is distinct from new.client_id then
    raise exception 'profile client_id cannot be changed directly';
  end if;

  if old.created_at is distinct from new.created_at then
    raise exception 'profile created_at cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists prevent_profile_protected_field_update on public.profiles;
create trigger prevent_profile_protected_field_update
before update on public.profiles
for each row execute function public.prevent_profile_protected_field_update();

create or replace function public.is_studio_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  or exists (
    select 1
    from public.admin_profiles ap
    where ap.auth_user_id = auth.uid()
      and ap.role = 'super_admin'
      and ap.status = 'active'
  )
$$;

create or replace function public.current_client_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select p.client_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.can_access_client(p_client_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.is_studio_admin() or public.current_client_id() = p_client_id, false)
$$;

create or replace function public.create_studio_client_profile(
  p_auth_user_id uuid,
  p_name text,
  p_email text,
  p_company text default null,
  p_phone text default null,
  p_whatsapp text default null,
  p_ip text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_profile_row public.profiles%rowtype;
  v_client_row public.clients%rowtype;
begin
  if p_auth_user_id is null then
    raise exception 'auth_user_id is required';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'name is required';
  end if;

  if coalesce(v_email, '') = '' then
    raise exception 'email is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_email, 3101));

  if exists (
    select 1 from public.profiles
    where lower(trim(email)) = v_email
       or id = p_auth_user_id
  ) then
    raise exception 'profile already exists';
  end if;

  if exists (
    select 1 from public.clients
    where lower(trim(email)) = v_email
  ) then
    raise exception 'client already exists';
  end if;

  insert into public.clients (
    name,
    legal_name,
    contact_name,
    email,
    phone,
    whatsapp,
    status,
    type,
    origin
  )
  values (
    coalesce(nullif(trim(p_company), ''), trim(p_name)),
    nullif(trim(p_company), ''),
    trim(p_name),
    v_email,
    nullif(trim(p_phone), ''),
    nullif(trim(p_whatsapp), ''),
    'lead',
    'company',
    'studio_registration'
  )
  returning * into v_client_row;

  insert into public.profiles (
    id,
    nome,
    email,
    role,
    client_id
  )
  values (
    p_auth_user_id,
    trim(p_name),
    v_email,
    'client',
    v_client_row.id
  )
  returning * into v_profile_row;

  insert into public.audit_logs (
    actor_profile_id,
    client_id,
    entity_type,
    entity_id,
    action,
    new_data,
    ip,
    user_agent,
    metadata
  )
  values
    (
      v_profile_row.id,
      v_client_row.id,
      'profile',
      v_profile_row.id,
      'profile_created',
      to_jsonb(v_profile_row) - 'email',
      nullif(p_ip, '')::inet,
      p_user_agent,
      jsonb_build_object('source', 'register-studio-client')
    ),
    (
      v_profile_row.id,
      v_client_row.id,
      'client',
      v_client_row.id,
      'client_created',
      to_jsonb(v_client_row) - 'email',
      nullif(p_ip, '')::inet,
      p_user_agent,
      jsonb_build_object('source', 'register-studio-client')
    ),
    (
      v_profile_row.id,
      v_client_row.id,
      'profile_client_link',
      v_client_row.id,
      'profile_linked_to_client',
      jsonb_build_object(
        'profile_id', v_profile_row.id,
        'client_id', v_client_row.id
      ),
      nullif(p_ip, '')::inet,
      p_user_agent,
      jsonb_build_object('source', 'register-studio-client')
    );

  return jsonb_build_object(
    'profile_id', v_profile_row.id,
    'client_id', v_client_row.id
  );
end;
$$;

revoke all on function public.create_studio_client_profile(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public;

revoke all on function public.create_studio_client_profile(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from anon;

revoke all on function public.create_studio_client_profile(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from authenticated;

grant execute on function public.create_studio_client_profile(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Usuário autenticado pode ler profiles" on public.profiles;
drop policy if exists "Usuario autenticado pode ler profiles" on public.profiles;
drop policy if exists "profiles_select_own_or_studio_admin" on public.profiles;
create policy "profiles_select_own_or_studio_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_studio_admin());

drop policy if exists "profiles_insert_own_client" on public.profiles;
create policy "profiles_insert_own_client"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and coalesce(role, 'client') = 'client'
  and client_id is null
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and coalesce(role, 'client') = 'client'
);

drop policy if exists "clients_select_own_or_studio_admin" on public.clients;
create policy "clients_select_own_or_studio_admin"
on public.clients
for select
to authenticated
using (public.can_access_client(id));

drop policy if exists "audit_logs_select_studio_admin" on public.audit_logs;
create policy "audit_logs_select_studio_admin"
on public.audit_logs
for select
to authenticated
using (public.is_studio_admin());

grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.clients to authenticated;
grant select on public.audit_logs to authenticated;
grant execute on function public.current_client_id() to authenticated;
grant execute on function public.can_access_client(uuid) to authenticated;
grant execute on function public.is_studio_admin() to authenticated;

comment on table public.audit_logs is 'Auditoria unificada do DOZEDEV Studio. Nao armazenar senhas, tokens ou chaves.';
comment on function public.create_studio_client_profile(uuid, text, text, text, text, text, text, text) is 'Cria profile, client e auditoria em transacao. Deve ser chamada por backend com service role apos criar auth.users.';
