create extension if not exists pgcrypto;

do $$ begin
  create type admin_role as enum ('super_admin', 'admin', 'suporte', 'financeiro', 'comercial');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type record_status as enum ('active', 'inactive');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type system_status as enum ('development', 'beta', 'available', 'maintenance', 'discontinued');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type client_type as enum ('individual', 'company');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type client_status as enum ('lead', 'active', 'suspended', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type billing_cycle as enum ('monthly', 'quarterly', 'yearly', 'custom');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type deployment_environment as enum ('development', 'staging', 'production');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type deployment_status as enum ('provisioning', 'active', 'suspended', 'maintenance', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type support_priority as enum ('low', 'normal', 'high', 'urgent');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type support_status as enum ('open', 'in_progress', 'closed');
exception when duplicate_object then null;
end $$;

create table if not exists admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role admin_role not null default 'suporte',
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists systems (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  slug text not null unique,
  description text,
  category text,
  current_version text,
  status system_status not null default 'development',
  public_url text,
  repository_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  type client_type not null default 'company',
  name text not null,
  legal_name text,
  document text,
  email text,
  phone text,
  whatsapp text,
  country text,
  city text,
  address text,
  contact_name text,
  status client_status not null default 'lead',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references systems(id) on delete restrict,
  name text not null,
  description text,
  price numeric(12, 2) not null default 0,
  currency text not null default 'EUR',
  billing_cycle billing_cycle not null default 'monthly',
  user_limit integer,
  unit_limit integer,
  storage_limit text,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (system_id, name)
);

create table if not exists deployments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  system_id uuid not null references systems(id) on delete restrict,
  plan_id uuid not null references plans(id) on delete restrict,
  instance_name text not null,
  subdomain text,
  production_url text,
  environment deployment_environment not null default 'production',
  version text not null,
  database_provider text,
  database_reference text,
  status deployment_status not null default 'provisioning',
  start_date date,
  renewal_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists deployment_history (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid not null references deployments(id) on delete cascade,
  action text not null,
  description text,
  previous_status deployment_status,
  new_status deployment_status,
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists support_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  deployment_id uuid references deployments(id) on delete cascade,
  title text not null,
  description text,
  priority support_priority not null default 'normal',
  status support_status not null default 'open',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_email on clients(email);
create index if not exists idx_clients_status on clients(status);
create index if not exists idx_systems_slug on systems(slug);
create index if not exists idx_systems_status on systems(status);
create index if not exists idx_plans_system_id on plans(system_id);
create index if not exists idx_plans_status on plans(status);
create index if not exists idx_deployments_client_id on deployments(client_id);
create index if not exists idx_deployments_system_id on deployments(system_id);
create index if not exists idx_deployments_status on deployments(status);
create index if not exists idx_deployments_renewal_date on deployments(renewal_date);
create index if not exists idx_deployment_history_deployment_id on deployment_history(deployment_id);
create index if not exists idx_support_notes_client_id on support_notes(client_id);
create index if not exists idx_support_notes_deployment_id on support_notes(deployment_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_admin_profiles_updated_at on admin_profiles;
create trigger set_admin_profiles_updated_at before update on admin_profiles for each row execute function set_updated_at();
drop trigger if exists set_systems_updated_at on systems;
create trigger set_systems_updated_at before update on systems for each row execute function set_updated_at();
drop trigger if exists set_clients_updated_at on clients;
create trigger set_clients_updated_at before update on clients for each row execute function set_updated_at();
drop trigger if exists set_plans_updated_at on plans;
create trigger set_plans_updated_at before update on plans for each row execute function set_updated_at();
drop trigger if exists set_deployments_updated_at on deployments;
create trigger set_deployments_updated_at before update on deployments for each row execute function set_updated_at();
drop trigger if exists set_support_notes_updated_at on support_notes;
create trigger set_support_notes_updated_at before update on support_notes for each row execute function set_updated_at();

create or replace function current_admin_role()
returns admin_role
language sql
security definer
set search_path = public
stable
as $$
  select role
  from admin_profiles
  where id = auth.uid()
    and status = 'active'
  limit 1
$$;

create or replace function is_admin_role(allowed_roles admin_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(current_admin_role() = any(allowed_roles), false)
$$;

alter table admin_profiles enable row level security;
alter table systems enable row level security;
alter table clients enable row level security;
alter table plans enable row level security;
alter table deployments enable row level security;
alter table deployment_history enable row level security;
alter table support_notes enable row level security;

drop policy if exists "admin_profiles_select_authorized" on admin_profiles;
create policy "admin_profiles_select_authorized" on admin_profiles
for select to authenticated
using (id = auth.uid() or is_admin_role(array['super_admin']::admin_role[]));

drop policy if exists "admin_profiles_manage_super_admin" on admin_profiles;
create policy "admin_profiles_manage_super_admin" on admin_profiles
for all to authenticated
using (is_admin_role(array['super_admin']::admin_role[]))
with check (is_admin_role(array['super_admin']::admin_role[]));

drop policy if exists "systems_select_admins" on systems;
create policy "systems_select_admins" on systems
for select to authenticated
using (is_admin_role(array['super_admin','admin','suporte','financeiro','comercial']::admin_role[]));

drop policy if exists "systems_update_admins" on systems;
create policy "systems_update_admins" on systems
for update to authenticated
using (is_admin_role(array['super_admin','admin']::admin_role[]))
with check (is_admin_role(array['super_admin','admin']::admin_role[]));

drop policy if exists "clients_select_authorized" on clients;
create policy "clients_select_authorized" on clients
for select to authenticated
using (is_admin_role(array['super_admin','admin','suporte','financeiro','comercial']::admin_role[]));

drop policy if exists "clients_insert_authorized" on clients;
create policy "clients_insert_authorized" on clients
for insert to authenticated
with check (is_admin_role(array['super_admin','admin','comercial']::admin_role[]));

drop policy if exists "clients_update_authorized" on clients;
create policy "clients_update_authorized" on clients
for update to authenticated
using (is_admin_role(array['super_admin','admin','comercial','financeiro']::admin_role[]))
with check (is_admin_role(array['super_admin','admin','comercial','financeiro']::admin_role[]));

drop policy if exists "plans_select_authorized" on plans;
create policy "plans_select_authorized" on plans
for select to authenticated
using (is_admin_role(array['super_admin','admin','suporte','financeiro','comercial']::admin_role[]));

drop policy if exists "plans_manage_authorized" on plans;
create policy "plans_manage_authorized" on plans
for all to authenticated
using (is_admin_role(array['super_admin','financeiro']::admin_role[]))
with check (is_admin_role(array['super_admin','financeiro']::admin_role[]));

drop policy if exists "deployments_select_authorized" on deployments;
create policy "deployments_select_authorized" on deployments
for select to authenticated
using (is_admin_role(array['super_admin','admin','suporte','comercial']::admin_role[]));

drop policy if exists "deployments_insert_authorized" on deployments;
create policy "deployments_insert_authorized" on deployments
for insert to authenticated
with check (is_admin_role(array['super_admin','admin','comercial']::admin_role[]));

drop policy if exists "deployments_update_authorized" on deployments;
create policy "deployments_update_authorized" on deployments
for update to authenticated
using (is_admin_role(array['super_admin','admin']::admin_role[]))
with check (is_admin_role(array['super_admin','admin']::admin_role[]));

drop policy if exists "deployment_history_select_authorized" on deployment_history;
create policy "deployment_history_select_authorized" on deployment_history
for select to authenticated
using (is_admin_role(array['super_admin','admin','suporte','comercial']::admin_role[]));

drop policy if exists "deployment_history_insert_authorized" on deployment_history;
create policy "deployment_history_insert_authorized" on deployment_history
for insert to authenticated
with check (is_admin_role(array['super_admin','admin']::admin_role[]));

drop policy if exists "support_notes_select_authorized" on support_notes;
create policy "support_notes_select_authorized" on support_notes
for select to authenticated
using (is_admin_role(array['super_admin','admin','suporte']::admin_role[]));

drop policy if exists "support_notes_manage_authorized" on support_notes;
create policy "support_notes_manage_authorized" on support_notes
for all to authenticated
using (is_admin_role(array['super_admin','admin','suporte']::admin_role[]))
with check (is_admin_role(array['super_admin','admin','suporte']::admin_role[]));

insert into systems (code, name, slug, description, category, current_version, status)
values
  ('DOZECLIN', 'DOZECLIN', 'dozeclin', 'Gestao de clinicas, agenda, pacientes, prontuarios e financeiro.', 'Clinicas', '0.1.0', 'available'),
  ('DOZEEAT', 'DOZEEAT', 'dozeeat', 'Gestao de restaurantes, pizzarias, delivery e operacao comercial.', 'Restaurantes', '0.1.0', 'beta'),
  ('DOZEIRON', 'DOZEIRON', 'dozeiron', 'Gestao de academias, alunos, treinos, matriculas e planos.', 'Academias', '0.1.0', 'development'),
  ('DOZEPLAY', 'DOZEPLAY', 'dozeplay', 'Gestao de streaming, multimedia, clientes, planos e acessos.', 'Streaming', '0.1.0', 'development')
on conflict (code) do nothing;

insert into plans (system_id, name, description, price, currency, billing_cycle, status)
select s.id, p.name, 'A definir', 0, 'EUR', 'custom', 'active'
from systems s
cross join (values ('Essencial'), ('Profissional'), ('Empresarial')) as p(name)
on conflict (system_id, name) do nothing;
