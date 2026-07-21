drop policy if exists "clients_delete_studio_admin" on public.clients;

create policy "clients_delete_studio_admin"
on public.clients
for delete
to authenticated
using (public.is_studio_admin());

grant delete on public.clients to authenticated;

comment on policy "clients_delete_studio_admin" on public.clients is
  'Permite que apenas Studio Admin exclua registros de clientes de teste pelo painel administrativo. Nao remove auth.users.';
