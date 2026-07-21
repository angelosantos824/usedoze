-- HOTFIX 3.2.2 - Diagnostico Duarte Transporte
-- Executar no SQL Editor do Supabase antes de corrigir dados.
-- Nao altera dados.

-- 1. Confirmar colunas reais antes de montar consultas operacionais.
select table_schema, table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema in ('public', 'storage')
  and table_name in (
    'profiles',
    'clients',
    'projects',
    'project_comments',
    'project_uploads',
    'objects'
  )
order by table_schema, table_name, ordinal_position;

-- 2. Policies reais relevantes.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
  and tablename in ('projects', 'project_comments', 'project_uploads', 'objects')
order by schemaname, tablename, policyname;

-- 3. Texto antigo das policies do bucket project-files.
-- Guardar este resultado no relatorio antes de aplicar a migration.
select policyname, permissive, roles, cmd, qual as old_using, with_check as old_with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    coalesce(qual, '') ilike '%project-files%'
    or coalesce(with_check, '') ilike '%project-files%'
  )
order by policyname;

-- 4. Configuracao real do bucket.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'project-files';

-- 5. Triggers reais relevantes.
select event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('projects', 'project_comments', 'project_uploads')
order by event_object_table, trigger_name;

-- 6. Diagnostico Duarte por profile/client/project.
select
  p.id as profile_id,
  p.client_id as profile_client_id,
  p.nome as profile_nome,
  p.email as profile_email,
  c.id as client_id,
  c.name as client_name,
  c.contact_name as client_contact_name,
  c.email as client_email,
  pr.id as project_id,
  pr.client_id as project_client_id,
  pr.name as project_name,
  pr.service_type,
  pr.status,
  pr.progress,
  pr.preview_url,
  pr.approval_requested_at,
  pr.approved_at,
  pr.updated_at
from public.profiles p
left join public.clients c
  on c.id = p.client_id
left join public.projects pr
  on pr.client_id = c.id
where
  lower(coalesce(c.name, '')) like '%duarte%'
  or lower(coalesce(c.contact_name, '')) like '%duarte%'
  or lower(coalesce(c.email, '')) like '%duarte%'
  or lower(coalesce(p.nome, '')) like '%duarte%'
  or lower(coalesce(p.email, '')) like '%duarte%'
  or lower(coalesce(pr.name, '')) like '%duarte%'
order by c.created_at nulls last, pr.updated_at desc nulls last;

-- 7. Clientes Duarte duplicados.
select
  lower(trim(coalesce(name, contact_name, email))) as chave,
  count(*) as total,
  array_agg(id order by created_at) as client_ids,
  array_agg(email order by created_at) as emails
from public.clients
where lower(coalesce(name, '')) like '%duarte%'
   or lower(coalesce(contact_name, '')) like '%duarte%'
   or lower(coalesce(email, '')) like '%duarte%'
group by lower(trim(coalesce(name, contact_name, email)))
having count(*) > 1;

-- 8. Projetos Duarte sem preview/status/progresso esperado.
select
  pr.id,
  pr.client_id,
  c.name as client_name,
  pr.name,
  pr.status,
  pr.progress,
  pr.preview_url,
  pr.approval_requested_at,
  case
    when pr.preview_url is null or trim(pr.preview_url) = '' then 'missing_preview_url'
    when pr.status <> 'awaiting_client_approval' then 'unexpected_status'
    when pr.progress is null then 'missing_progress'
    when pr.approval_requested_at is null then 'missing_approval_requested_at'
    else 'ok'
  end as diagnostic
from public.projects pr
join public.clients c
  on c.id = pr.client_id
where lower(coalesce(c.name, '')) like '%duarte%'
   or lower(coalesce(c.contact_name, '')) like '%duarte%'
   or lower(coalesce(pr.name, '')) like '%duarte%'
order by pr.updated_at desc;

-- 9. Uploads e paths esperados para Duarte.
select
  pu.id,
  pu.client_id,
  pu.project_id,
  pu.nome_arquivo,
  pu.caminho,
  pu.storage_bucket,
  pu.storage_path,
  pu.tipo,
  pu.criado_em
from public.project_uploads pu
join public.clients c
  on c.id = pu.client_id
where lower(coalesce(c.name, '')) like '%duarte%'
   or lower(coalesce(c.contact_name, '')) like '%duarte%'
order by pu.criado_em desc;

-- 10. Confirmar policies novas apos aplicar a migration.
select policyname, cmd, qual as new_using, with_check as new_with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    coalesce(qual, '') ilike '%project-files%'
    or coalesce(with_check, '') ilike '%project-files%'
  )
order by policyname;

-- 11. Confirmar estrutura final de project_uploads apos aplicar a migration.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'project_uploads'
order by ordinal_position;
