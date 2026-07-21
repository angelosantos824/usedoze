-- DOZEDEV Studio - Sprint 3.1
-- Diagnostico e backfill seguro para auth.users -> profiles -> clients.
-- Nao executar automaticamente. Rever resultados antes de aplicar qualquer bloco de backfill.
--
-- Normalizacao oficial de email nesta Sprint:
-- lower(trim(email))
--
-- Fase A pode ser executada antes da migration.
-- Fase B e o backfill comentado dependem da migration ja aplicada.

-- ============================================================================
-- FASE A - DIAGNOSTICO PRE-MIGRATION
-- Nao depende de profiles.client_id, audit_logs ou colunas novas.
-- ============================================================================

-- A1. Estrutura real das tabelas principais.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'clients')
order by table_name, ordinal_position;

-- A2. Constraints.
select
  c.conrelid::regclass as table_name,
  c.conname,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.conrelid in ('public.profiles'::regclass, 'public.clients'::regclass)
order by table_name, c.conname;

-- A3. Indices.
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('profiles', 'clients')
order by tablename, indexname;

-- A4. Triggers.
select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('profiles', 'clients')
order by event_object_table, trigger_name;

-- A5. RLS e policies.
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where oid in ('public.profiles'::regclass, 'public.clients'::regclass)
order by relname;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'clients')
order by tablename, policyname;

-- A6. Duplicacoes por email normalizado.
select 'profiles' as source, lower(trim(email)) as email_normalizado, count(*)
from public.profiles
where email is not null
group by lower(trim(email))
having count(*) > 1
union all
select 'clients' as source, lower(trim(email)) as email_normalizado, count(*)
from public.clients
where email is not null
group by lower(trim(email))
having count(*) > 1
union all
select 'auth.users' as source, lower(trim(email)) as email_normalizado, count(*)
from auth.users
where email is not null
group by lower(trim(email))
having count(*) > 1
order by source, email_normalizado;

-- A7. Utilizadores Auth sem profile.
select u.id, u.email, u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
order by u.created_at desc;

-- A8. Profiles existentes antes do client_id.
select p.id, p.nome, p.email, p.role, p.created_at
from public.profiles p
order by p.created_at desc nulls last;

-- A9. Clients sem profile associado por email normalizado.
-- Antes da migration ainda nao existe profiles.client_id.
select c.id, c.name, c.email, c.contact_name, c.created_at
from public.clients c
left join public.profiles p on lower(trim(p.email)) = lower(trim(c.email))
where p.id is null
order by c.created_at desc;

-- A10. Duarte Transporte, sem depender de profiles.client_id.
select 'profiles' as source, p.id::text, p.nome as name, p.email, p.role as status_or_role, null::text as contact_name
from public.profiles p
where lower(trim(coalesce(p.email, ''))) like '%duarte%'
   or lower(trim(coalesce(p.nome, ''))) like '%duarte%'
union all
select 'clients' as source, c.id::text, c.name, c.email, c.status::text, c.contact_name
from public.clients c
where lower(trim(coalesce(c.email, ''))) like '%duarte%'
   or lower(trim(coalesce(c.name, ''))) like '%duarte%'
   or lower(trim(coalesce(c.legal_name, ''))) like '%duarte%'
   or lower(trim(coalesce(c.contact_name, ''))) like '%duarte%';

-- A11. Candidatos inequivocos por email normalizado para futura associacao.
-- Apenas diagnostico. Nao atualiza dados.
with matches as (
  select
    p.id as profile_id,
    c.id as client_id,
    lower(trim(p.email)) as email,
    p.created_at as profile_created_at,
    c.created_at as client_created_at
  from public.profiles p
  join public.clients c on lower(trim(c.email)) = lower(trim(p.email))
  where p.email is not null
    and c.email is not null
),
safe_matches as (
  select
    email,
    (array_agg(profile_id order by profile_created_at nulls last, profile_id::text))[1] as profile_id,
    (array_agg(client_id order by client_created_at nulls last, client_id::text))[1] as client_id
  from matches
  group by email
  having count(distinct profile_id) = 1
     and count(distinct client_id) = 1
)
select *
from safe_matches
order by email;

-- A12. Casos ambiguos por email normalizado para correcao manual.
with matches as (
  select p.id as profile_id, c.id as client_id, lower(trim(p.email)) as email
  from public.profiles p
  join public.clients c on lower(trim(c.email)) = lower(trim(p.email))
  where p.email is not null
    and c.email is not null
)
select email, count(distinct profile_id) as profiles, count(distinct client_id) as clients
from matches
group by email
having count(distinct profile_id) > 1
    or count(distinct client_id) > 1;

-- ============================================================================
-- FASE B - DIAGNOSTICO POS-MIGRATION
-- Executar somente depois da migration criar profiles.client_id e audit_logs.
-- ============================================================================

-- B1. Profiles sem client_id apos migration.
select p.id, p.nome, p.email, p.role, p.client_id
from public.profiles p
where p.client_id is null
order by p.created_at desc nulls last;

-- B2. Clients sem profile associado por profiles.client_id apos migration.
select c.id, c.name, c.email, c.contact_name, c.created_at
from public.clients c
left join public.profiles p on p.client_id = c.id
where p.id is null
order by c.created_at desc;

-- B3. Validar policy ampla removida.
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
  and (
    policyname in (
      'Usuário autenticado pode ler profiles',
      'Usuario autenticado pode ler profiles'
    )
    or (cmd = 'SELECT' and qual = 'true')
  );

-- B4. Backfill idempotente para matches inequivocos.
-- Rever o SELECT A11 antes de executar.
-- Nao executar nesta fase de pre-aplicacao.
/*
begin;

select set_config('app.allow_profile_protected_update', 'on', true);

with profile_candidates as (
  select p.id as profile_id, lower(trim(p.email)) as email, p.created_at
  from public.profiles p
  where p.client_id is null
    and p.email is not null
),
client_candidates as (
  select c.id as client_id, lower(trim(c.email)) as email, c.created_at
  from public.clients c
  where c.email is not null
),
matches as (
  select
    pc.profile_id,
    cc.client_id,
    pc.email,
    pc.created_at as profile_created_at,
    cc.created_at as client_created_at
  from profile_candidates pc
  join client_candidates cc on cc.email = pc.email
),
safe_matches as (
  select
    email,
    (array_agg(profile_id order by profile_created_at nulls last, profile_id::text))[1] as profile_id,
    (array_agg(client_id order by client_created_at nulls last, client_id::text))[1] as client_id
  from matches
  group by email
  having count(distinct profile_id) = 1
     and count(distinct client_id) = 1
),
updated_profiles as (
  update public.profiles p
  set client_id = sm.client_id
  from safe_matches sm
  where p.id = sm.profile_id
    and p.client_id is null
  returning p.id, p.client_id
)
insert into public.audit_logs (
  actor_profile_id,
  client_id,
  entity_type,
  entity_id,
  action,
  new_data,
  metadata
)
select
  up.id,
  up.client_id,
  'profile_client_link',
  up.client_id,
  'profile_client_backfilled',
  jsonb_build_object('profile_id', up.id, 'client_id', up.client_id),
  jsonb_build_object('source', 'sprint_3_1_backfill')
from updated_profiles up;

commit;
*/
