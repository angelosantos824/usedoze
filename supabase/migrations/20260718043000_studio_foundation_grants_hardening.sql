-- DOZEDEV Studio - Sprint 3.1.2.1
-- Hardening de grants da fundacao.
-- Preparada para revisao. Nao aplicar sem validacao funcional.

revoke all on table public.profiles from anon;
revoke all on table public.clients from anon;
revoke all on table public.audit_logs from anon;

revoke all on table public.profiles from authenticated;
revoke all on table public.clients from authenticated;
revoke all on table public.audit_logs from authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.clients to authenticated;
grant select on table public.audit_logs to authenticated;

comment on table public.audit_logs is
  'Auditoria unificada do DOZEDEV Studio. Escrita direta por anon/authenticated nao permitida; usar RPC/backend controlado.';
