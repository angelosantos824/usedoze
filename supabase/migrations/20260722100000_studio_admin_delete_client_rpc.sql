create or replace function public.delete_studio_client_admin(p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_client public.clients%rowtype;
  v_deleted jsonb;
begin
  if not public.is_studio_admin() then
    raise exception 'studio admin required';
  end if;

  select *
  into v_client
  from public.clients
  where id = p_client_id
  for update;

  if not found then
    raise exception 'client not found';
  end if;

  insert into public.audit_logs (
    client_id,
    entity_type,
    entity_id,
    action,
    old_data,
    metadata
  )
  values (
    p_client_id,
    'client',
    p_client_id,
    'client.deleted_by_admin',
    to_jsonb(v_client),
    jsonb_build_object('source', 'delete_studio_client_admin')
  );

  update public.audit_logs
  set client_id = null
  where client_id = p_client_id;

  update public.profiles
  set client_id = null
  where client_id = p_client_id;

  delete from public.project_comments
  where client_id = p_client_id;

  delete from public.project_updates
  where client_id = p_client_id;

  delete from public.project_uploads
  where client_id = p_client_id;

  delete from public.projects
  where client_id = p_client_id;

  delete from public.briefings
  where client_id = p_client_id;

  delete from public.clients
  where id = p_client_id;

  v_deleted =
    jsonb_build_object(
      'id',
      v_client.id,
      'name',
      v_client.name,
      'contact_name',
      v_client.contact_name,
      'email',
      v_client.email
    );

  return v_deleted;
end;
$$;

grant execute on function public.delete_studio_client_admin(uuid) to authenticated;

comment on function public.delete_studio_client_admin(uuid) is
  'Exclui um cliente do DOZEDEV Studio e dados vinculados do Studio. Nao remove auth.users.';
