-- HOTFIX 2026-07-21 - Diagnostico cadastro DOZEDEV Studio.
-- Executar no Supabase SQL Editor com permissao para auth.users.
-- Este script nao altera dados.

-- 1. Confirmar schema real antes de montar/ajustar consultas.
select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema in ('auth', 'public')
  and table_name in ('users', 'profiles', 'clients', 'audit_logs')
order by table_schema, table_name, ordinal_position;

-- 2. Confirmar constraints e vinculos disponiveis.
select
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema = tc.constraint_schema
 and ccu.constraint_name = tc.constraint_name
where tc.table_schema in ('auth', 'public')
  and tc.table_name in ('users', 'profiles', 'clients', 'audit_logs')
order by tc.table_schema, tc.table_name, tc.constraint_name;

-- 3. Caso afetado: admin@teste.com em Auth, profiles, clients e vinculo profile -> client.
with alvo as (
  select lower(trim('admin@teste.com')) as email
)
select
  u.id as auth_user_id,
  u.email as auth_email,
  u.created_at as auth_created_at,
  p.id as profile_id,
  p.email as profile_email,
  p.client_id as profile_client_id,
  c.id as client_id,
  c.email as client_email,
  c.name as client_name,
  c.contact_name as client_contact_name,
  c.status as client_status,
  case when p.id = u.id then true else false end as profile_matches_auth_user,
  case when p.client_id = c.id then true else false end as profile_matches_client
from alvo
left join auth.users u
  on lower(trim(u.email)) = alvo.email
left join public.profiles p
  on p.id = u.id
left join public.clients c
  on c.id = p.client_id;

-- 4. Registos por email em public.profiles e public.clients, incluindo possiveis duplicados.
with alvo as (
  select lower(trim('admin@teste.com')) as email
)
select
  'profiles' as origem,
  p.id::text as id,
  p.email,
  p.client_id::text as linked_client_id,
  p.created_at
from public.profiles p, alvo
where lower(trim(p.email)) = alvo.email
union all
select
  'clients' as origem,
  c.id::text as id,
  c.email,
  null::text as linked_client_id,
  c.created_at
from public.clients c, alvo
where lower(trim(c.email)) = alvo.email
order by origem, created_at;

-- 5. Auditoria relacionada ao caso afetado.
with alvo as (
  select
    u.id as auth_user_id,
    p.id as profile_id,
    p.client_id
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(trim(u.email)) = lower(trim('admin@teste.com'))
)
select
  al.id,
  al.occurred_at,
  al.actor_profile_id,
  al.client_id,
  al.entity_type,
  al.entity_id,
  al.action,
  al.metadata
from public.audit_logs al
where al.actor_profile_id in (select profile_id from alvo)
   or al.client_id in (select client_id from alvo)
   or al.entity_id in (
     select auth_user_id from alvo
     union
     select profile_id from alvo
     union
     select client_id from alvo
   )
   or lower(al.metadata::text) like '%admin@teste.com%'
order by al.occurred_at desc;

-- 6. Todos os auth.users sem public.profiles. Nao corrigir automaticamente.
select
  u.email,
  u.id as auth_user_id,
  u.created_at as auth_created_at,
  false as profile_exists,
  exists (
    select 1
    from public.clients c
    where lower(trim(c.email)) = lower(trim(u.email))
  ) as client_exists_by_email,
  case
    when u.raw_user_meta_data ? 'nome' then 'legacy_signup_user_metadata_nome'
    when u.raw_app_meta_data ? 'provider' then 'auth_provider_' || (u.raw_app_meta_data ->> 'provider')
    else 'unknown'
  end as possible_origin
from auth.users u
left join public.profiles p
  on p.id = u.id
where p.id is null
order by u.created_at desc;

-- 7. Profiles sem client_id ou com client_id quebrado.
select
  p.id as profile_id,
  p.email,
  p.created_at,
  p.client_id,
  c.id as client_id,
  case
    when p.client_id is null then 'profile_without_client_id'
    when c.id is null then 'profile_client_id_without_client'
    else 'ok'
  end as status
from public.profiles p
left join public.clients c
  on c.id = p.client_id
where p.client_id is null
   or c.id is null
order by p.created_at desc;
