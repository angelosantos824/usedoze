drop policy if exists "briefings_delete_studio_admin" on public.briefings;

create policy "briefings_delete_studio_admin"
on public.briefings
for delete
to authenticated
using (public.is_studio_admin());

grant delete on public.briefings to authenticated;

drop policy if exists "project_comments_delete_briefing_studio_admin" on public.project_comments;

create policy "project_comments_delete_briefing_studio_admin"
on public.project_comments
for delete
to authenticated
using (
  public.is_studio_admin()
  and briefing_id is not null
);

grant delete on public.project_comments to authenticated;

comment on policy "briefings_delete_studio_admin" on public.briefings is
  'Permite que apenas Studio Admin exclua briefings pelo painel administrativo.';
