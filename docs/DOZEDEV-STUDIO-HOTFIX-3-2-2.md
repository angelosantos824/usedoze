# DOZEDEV Studio - HOTFIX 3.2.2

Data: 2026-07-21

## Escopo

Finalizacao baseada no diagnostico real de producao para:

- painel do cliente sem projetos;
- upload de arquivos bloqueado por RLS no bucket privado `project-files`;
- alinhamento de metadados em `public.project_uploads`.

Nao foram alterados:

- autenticacao;
- Turnstile;
- Resend;
- DOZECLIN;
- schema `dozeclin`;
- dados de clientes;
- contas de utilizadores.

## Diagnostico confirmado

O profile do Duarte esta correto:

- `profiles.client_id = 768931b6-fe4e-4e49-924f-a17758e147d2`
- `clients.id = 768931b6-fe4e-4e49-924f-a17758e147d2`

Nao existe projeto do Duarte em `public.projects`.

A consulta real retornou:

- `project_id = null`
- `project_client_id = null`
- `project_name = null`

Conclusao: o painel do cliente nao esta vazio por erro em `profiles` ou `clients`. Ele esta vazio porque nao ha linha em `public.projects` vinculada ao `client_id` existente.

Nao foi criado projeto automaticamente nesta migration. O projeto do Duarte deve ser criado pelo painel administrativo usando o `client_id` ja existente.

## Causa do upload

O bucket `project-files` existe e e privado.

O upload falha com:

```text
StorageApiError: new row violates row-level security policy
```

Causa confirmada: as policies antigas de `storage.objects` para o bucket `project-files` nao estavam alinhadas ao path novo:

```text
clients/{client_id}/projects/{project_id-ou-general}/{uuid}-{arquivo}
```

Como a policy nao reconhece o `client_id` nessa estrutura, o INSERT em `storage.objects` e bloqueado antes da gravacao dos metadados.

## Texto antigo das policies

O texto antigo deve ser capturado no SQL Editor antes da migration com:

```sql
select policyname, permissive, roles, cmd, qual as old_using, with_check as old_with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    coalesce(qual, '') ilike '%project-files%'
    or coalesce(with_check, '') ilike '%project-files%'
  )
order by policyname;
```

Arquivo preparado:

- `docs/sql/HOTFIX-3-2-2-DUARTE-DIAGNOSTICO.sql`

## Policies novas

A migration substitui somente policies de `storage.objects` cujo texto referencia `project-files`.

Nova regra de cliente:

- bucket precisa ser `project-files`;
- path precisa iniciar com `clients/{uuid-do-cliente}`;
- `{uuid-do-cliente}` precisa ser igual a `profiles.client_id` do utilizador autenticado.

Nova regra de admin:

- `public.is_studio_admin()` pode gerir todos os objetos do bucket `project-files`.

Operacoes:

- cliente autenticado pode fazer `select`, `insert` e `delete` somente no proprio diretorio;
- admin Studio pode fazer `select`, `insert`, `update` e `delete` em todo o bucket;
- nenhum outro bucket e afetado.

## Estrutura de project_uploads

A migration e incremental. Ela cria a tabela se nao existir e adiciona as colunas necessarias se estiverem ausentes:

- `profile_id`
- `client_id`
- `project_id`
- `tamanho`
- `storage_bucket`
- `storage_path`
- `created_at`

Registros legados sao preservados.

Tambem foi adicionada normalizacao por trigger:

- preenche `user_id`, `profile_id`, `client_id` e `email` a partir da sessao/profile quando possivel;
- sincroniza `storage_path` e `caminho`;
- valida que `project_id`, quando informado, pertence ao mesmo `client_id`;
- nao cria projeto automaticamente.

## Frontend alinhado

O frontend de upload usa:

- bucket: `project-files`;
- path: `clients/{client_id}/projects/{project_id-ou-general}/{uuid}-{arquivo}`;
- metadados: `user_id`, `profile_id`, `client_id`, `project_id`, `email`, `nome_arquivo`, `caminho`, `tipo`, `tamanho`, `storage_bucket`, `storage_path`.

Se o upload no Storage passar e o INSERT dos metadados falhar, o arquivo enviado e removido do bucket como compensacao.

## Migration final

Arquivo:

- `supabase/migrations/20260721090000_studio_project_approval_flow.sql`

Inclui:

- `public.projects`;
- `public.project_comments`;
- `public.project_uploads`;
- triggers de normalizacao;
- policies de `projects`;
- policies de `project_comments`;
- policies de `project_uploads`;
- bucket privado `project-files`;
- policies novas para `storage.objects` filtradas por `project-files`;
- RPCs de aprovacao e solicitacao de alteracoes.

## Testes SQL

Arquivo:

- `docs/sql/HOTFIX-3-2-2-DUARTE-DIAGNOSTICO.sql`

Verifica:

- colunas reais de `public.project_uploads`;
- texto antigo das policies do bucket `project-files`;
- configuracao real do bucket;
- vinculo `profiles.client_id -> clients.id`;
- existencia ou ausencia de projeto em `public.projects`;
- paths de uploads existentes;
- texto novo das policies apos aplicar a migration.

## Checks locais executados

- `Get-Content studio/js/dashboard.js | node --input-type=module --check`
- `Get-Content studio/js/uploads.js | node --input-type=module --check`
- `Get-Content studio/js/comments.js | node --input-type=module --check`
- `Get-Content studio/js/realtime.js | node --input-type=module --check`
- `Get-Content studio/js/main.js | node --input-type=module --check`
- `deno check supabase/functions/register-studio-client/index.ts`
- `deno check supabase/functions/resend-studio-confirmation/index.ts`
- `deno fmt --check supabase/migrations/20260721090000_studio_project_approval_flow.sql docs/sql/HOTFIX-3-2-2-DUARTE-DIAGNOSTICO.sql`
- `git diff --check`

## Arquivos alterados

- `studio/dashboard.html`
- `studio/admin.html`
- `studio/briefing.html`
- `studio/script.js`
- `studio/js/main.js`
- `studio/js/dashboard.js`
- `studio/js/comments.js`
- `studio/js/realtime.js`
- `studio/js/uploads.js`
- `supabase/migrations/20260721090000_studio_project_approval_flow.sql`
- `docs/sql/HOTFIX-3-2-2-DUARTE-DIAGNOSTICO.sql`
- `docs/DOZEDEV-STUDIO-HOTFIX-3-2-2.md`

## Pendencias de homologacao apos migration

- Capturar e anexar o texto antigo das policies antes da aplicacao.
- Aplicar a migration no ambiente alvo.
- Confirmar policies novas com o SQL de diagnostico.
- Criar o projeto do Duarte pelo painel administrativo usando o `client_id` existente.
- Testar upload real pelo cliente Duarte.
- Confirmar que admin visualiza o upload.
- Testar isolamento com outro cliente.

## Decisao

APROVADO PARA APLICACAO DA MIGRATION
