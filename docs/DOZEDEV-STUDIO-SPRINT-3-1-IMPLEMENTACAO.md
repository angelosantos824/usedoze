# DOZEDEV Studio - Sprint 3.1 - Fundacao

Data: 2026-07-18

## Escopo

Implementacao preparada para revisao, sem aplicar migration, sem alterar banco, sem deploy, sem commit e sem push.

Objetivo da Sprint 3.1:

- corrigir o nucleo `auth.users -> profiles -> clients`;
- preparar cadastro transacional via Edge Function;
- criar base inicial de auditoria unificada;
- manter compatibilidade com o fluxo atual por feature flag desligada.

## Diagnostico Real Confirmado

Foi executado comando nao destrutivo:

```bash
supabase.cmd gen types typescript --project-id crbxqjxpghgfqkibudlz --schema public
```

Confirmacoes do schema publico real:

- Projeto Supabase confirmado: `crbxqjxpghgfqkibudlz`.
- Projeto listado como `dozedev-studio`.
- `profiles` existe com: `id`, `nome`, `email`, `role`, `created_at`.
- `profiles` nao possui `client_id`.
- `clients` existe com dados comerciais, mas nao possui relacao com `profiles`.
- `briefings` existe e ainda usa `email`/`user_id` como campos de compatibilidade.
- `project_comments`, `project_uploads`, `notifications` e `vouchers` existem.
- `audit_logs` ainda nao existe.
- `admin_profiles.auth_user_id` existe no schema real.

Nao foi possivel confirmar diretamente via CLI:

- constraints reais completas;
- indices reais completos;
- triggers reais completos;
- policies/RLS reais completos;
- dados do cliente Duarte Transporte.

Motivo:

- O repositorio nao esta linkado ao projeto Supabase.
- `supabase status` tentou usar Docker local e falhou.
- A consulta de policies/constraints exige SQL direto no banco ou link/autenticacao DB.

Para cobrir essa lacuna, foi criado o script:

- `docs/sql/DOZEDEV-STUDIO-SPRINT-3-1-DIAGNOSTICO-BACKFILL.sql`

Esse script deve ser executado no SQL Editor antes de aplicar qualquer migration.

## Arquivos Criados

- `supabase/migrations/20260718032000_studio_client_foundation.sql`
- `supabase/functions/register-studio-client/index.ts`
- `studio/js/features.js`
- `docs/sql/DOZEDEV-STUDIO-SPRINT-3-1-DIAGNOSTICO-BACKFILL.sql`
- `docs/DOZEDEV-STUDIO-SPRINT-3-1-IMPLEMENTACAO.md`

## Arquivos Alterados

- `studio/js/auth.js`
- `docs/DOZEDEV-STUDIO-DATABASE.md`

## Migration Preparada

Arquivo:

```text
supabase/migrations/20260718032000_studio_client_foundation.sql
```

Inclui:

- `profiles.client_id`;
- `profiles.updated_at`;
- `clients.origin`;
- tabela `audit_logs`;
- FK `profiles.client_id -> clients.id`;
- indices basicos;
- trigger `set_profiles_updated_at`;
- helpers:
  - `is_studio_admin()`;
  - `current_client_id()`;
  - `can_access_client(uuid)`;
- RPC transacional:
  - `create_studio_client_profile(...)`;
- RLS em:
  - `profiles`;
  - `clients`;
  - `audit_logs`;
- policies controladas por `auth.uid()`, `client_id` e admin Studio.

Decisao importante:

- Nao foi criado `clients.profile_id`, para evitar circularidade. O vinculo oficial e `profiles.client_id -> clients.id`.

## Sprint 3.1.1 - Hardening De Seguranca

Atualizacao preparada em 2026-07-18, ainda sem aplicar SQL, deploy, commit ou push.

Correcoes adicionadas:

- RPC `public.create_studio_client_profile(...)` com `REVOKE ALL` explicito para `PUBLIC`, `anon` e `authenticated`.
- `GRANT EXECUTE` da RPC sensivel apenas para `service_role`.
- `pg_advisory_xact_lock` por email normalizado dentro da RPC para reduzir corrida entre validacao e insert.
- Trigger `prevent_profile_protected_field_update` em `profiles` para impedir alteracao direta de `id`, `role`, `client_id` e `created_at`.
- Bypass do trigger somente por fluxo administrativo explicito via `set_config('app.allow_profile_protected_update', 'on', true)`, usado no script de backfill revisado.
- Policy de insert legado exige `client_id is null` e role comum `client`.
- Edge Function sem CORS wildcard; origens permitidas por whitelist.
- Edge Function preparada para Cloudflare Turnstile via `TURNSTILE_REQUIRED=true` e `TURNSTILE_SECRET_KEY`.
- `email_confirm: false` para auto-registo publico, exigindo confirmacao normal de email.
- Reconciliação registrada quando Auth ja existe mas a fundacao Studio esta incompleta.
- Compensacao limitada ao Auth criado na propria execucao.
- IP sanitizado antes de gravacao/cast `inet`.
- Fluxo legado corrigido para bloquear duplo clique e nao mostrar sucesso se `profiles.insert` falhar.

Bloqueio de producao:

- Nao ativar `clientFoundationV2` em producao sem Turnstile configurado e validado.
- Nao aplicar a migration antes de executar o diagnostico e confirmar inexistencia de duplicados criticos.

## Sprint 3.1.2 - Pre-aplicacao Final

Atualizacao preparada em 2026-07-18, sem executar SQL, sem aplicar migration, sem backfill, sem deploy, sem commit e sem push.

Bloqueios eliminados:

- Script de diagnostico separado em Fase A pre-migration e Fase B pos-migration.
- Fase A nao referencia `profiles.client_id`, `audit_logs` ou colunas novas.
- Backfill comentado deixou de usar `min(uuid)` e passou a usar `array_agg(... order by ...)`.
- Normalizacao de email padronizada como `lower(trim(email))` em diagnostico, backfill, migration, indices e RPC.
- Migration remove explicitamente a policy ampla encontrada no banco:

```sql
drop policy if exists "Usuário autenticado pode ler profiles" on public.profiles;
drop policy if exists "Usuario autenticado pode ler profiles" on public.profiles;
drop policy if exists "profiles_select_own_or_studio_admin" on public.profiles;

create policy "profiles_select_own_or_studio_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_studio_admin());
```

Comandos Deno exigidos antes da aplicacao:

```bash
deno check supabase/functions/register-studio-client/index.ts
deno fmt supabase/functions/register-studio-client/index.ts
deno fmt --check supabase/functions/register-studio-client/index.ts
```

## Edge Function Preparada

Arquivo:

```text
supabase/functions/register-studio-client/index.ts
```

Responsabilidades:

- validar nome, email e senha;
- normalizar email;
- bloquear duplicidade em `profiles` e `clients`;
- criar utilizador em Supabase Auth com service role;
- chamar RPC transacional para criar `profiles`, `clients` e auditoria;
- compensar removendo Auth caso a criacao no banco falhe;
- registrar auditoria best-effort da compensacao;
- nao armazenar senha, token ou chave em auditoria.

Variaveis necessarias no ambiente da function:

- `SUPABASE_URL`;
- `SUPABASE_SERVICE_ROLE_KEY`.
- `TURNSTILE_REQUIRED`, recomendado como `true` antes de ativacao publica;
- `TURNSTILE_SECRET_KEY`, obrigatorio quando `TURNSTILE_REQUIRED=true`.

## Frontend Preparado

Arquivo novo:

```text
studio/js/features.js
```

Flag:

```js
export const FEATURES = {
  clientFoundationV2: false
};
```

Arquivo alterado:

```text
studio/js/auth.js
```

Com a flag desligada:

- cadastro legado continua funcionando como antes.

Com a flag ligada:

- cadastro chama `supabaseClient.functions.invoke("register-studio-client")`.

## Plano De Aplicacao

Nao executar sem aprovacao.

1. Executar `docs/sql/DOZEDEV-STUDIO-SPRINT-3-1-DIAGNOSTICO-BACKFILL.sql`.
2. Revisar duplicados, orfaos e casos ambiguos.
3. Corrigir manualmente casos ambiguos, se existirem.
4. Aplicar migration `20260718032000_studio_client_foundation.sql` em ambiente controlado.
5. Configurar secrets da Edge Function.
6. Deploy controlado da Edge Function.
7. Testar cadastro com feature flag ainda desligada.
8. Ativar `clientFoundationV2` em ambiente controlado.
9. Testar cadastro novo completo.
10. Rodar backfill idempotente somente apos revisar candidatos inequivocos.
11. Validar auditoria.
12. Configurar e validar Turnstile.
13. So depois considerar ativacao em producao.

## Rollback

### Rollback Funcional

1. Definir `clientFoundationV2: false`.
2. O frontend volta a usar o cadastro legado.
3. Manter Edge Function e migration sem uso enquanto se investiga.

### Rollback Da Edge Function

1. Remover ou despublicar `register-studio-client`.
2. Remover secrets da function, se necessario.
3. Confirmar que o frontend esta com `clientFoundationV2: false`.

### Rollback Da Migration

Nao executar rollback destrutivo sem backup. Plano seguro:

1. Desativar `clientFoundationV2`.
2. Revogar acesso publico da Edge Function ou remover secrets.
3. Remover policies novas apenas se estiverem bloqueando fluxo legado.
4. Manter `profiles.client_id`, `clients.origin` e `audit_logs` ate validacao.
5. Se o trigger bloquear uma operacao administrativa legitima, executar apenas fluxo autorizado que use `set_config('app.allow_profile_protected_update', 'on', true)` dentro da mesma transacao.
6. Se rollback estrutural for indispensavel e houver backup:
   - exportar `audit_logs`;
   - remover trigger `prevent_profile_protected_field_update`;
   - remover trigger `set_profiles_updated_at`;
   - remover functions novas;
   - remover policies novas;
   - remover constraints novas;
   - remover indices novos;
   - remover colunas novas somente se nao houver dados validos dependentes;
   - remover `audit_logs` somente apos exportar auditoria.

## Testes Obrigatorios Da Sprint 3.1

- [ ] Cadastro de novo cliente com `clientFoundationV2`.
- [ ] Criacao do utilizador em Auth.
- [ ] Criacao de `profiles`.
- [ ] Criacao de `clients`.
- [ ] `profiles.client_id = clients.id`.
- [ ] Login apos cadastro.
- [ ] Nome do cliente disponivel.
- [ ] Cliente visivel em `public.clients`.
- [ ] Bloqueio de email duplicado.
- [ ] Falha intermediaria remove Auth criado.
- [ ] Cliente nao acessa outro cliente.
- [ ] Admin acessa clientes autorizados.
- [ ] Backfill nao duplica.
- [ ] Backfill e idempotente.
- [ ] `audit_logs` registra profile/client/link/backfill/compensacao.

## Comandos De Validacao

Executados localmente ou previstos:

```bash
node --check studio/config.js
node --input-type=module --check
git diff --check
supabase db lint
```

Observacao:

- `supabase db lint` depende do projeto estar linkado ou de ambiente local com Docker acessivel.

## Restricoes Mantidas

- Projects nao implementado.
- Conversations/messages nao implementado.
- Uploads nao implementado.
- Vouchers nao implementado.
- `project_comments` nao removido.
- Campos antigos nao eliminados.
- Nenhuma limpeza destrutiva.
- Nenhum deploy.
- Nenhuma migration aplicada.
- Nenhum commit.
- Nenhum push.
