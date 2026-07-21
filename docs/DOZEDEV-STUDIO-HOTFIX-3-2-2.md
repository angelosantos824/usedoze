# DOZEDEV Studio - HOTFIX 3.2.2

Data: 2026-07-21

## Escopo

Correcoes para:

- projetos invisiveis no dashboard do cliente;
- cliente com multiplos projetos vendo apenas um;
- cartao de aprovacao indisponivel;
- comentarios de projeto por `project_id`/`client_id`;
- upload com erro generico e sem diagnostico por etapa.

Nao foram alterados:

- autenticacao;
- Turnstile;
- Resend;
- DOZECLIN;
- schema `dozeclin`.

## Diagnostico

Nao houve acesso direto ao banco real a partir deste ambiente. Por isso foi criado o SQL de diagnostico:

- `docs/sql/HOTFIX-3-2-2-DUARTE-DIAGNOSTICO.sql`

Esse SQL deve ser executado no Supabase antes de qualquer correcao de dados do Duarte. Ele verifica:

- colunas reais de `profiles`, `clients`, `projects`, `project_comments`, `project_uploads` e `storage.objects`;
- policies reais;
- triggers reais;
- vinculo `profiles.client_id -> clients.id -> projects.client_id`;
- clientes Duarte duplicados;
- projetos Duarte sem `preview_url`, status esperado, progresso ou `approval_requested_at`;
- uploads do Duarte e paths gravados.

## Causa tecnica corrigida no frontend

### Projeto invisivel / progresso 0%

A consulta do dashboard escolhia apenas um projeto com `limit(1)` e ainda misturava briefings com projeto atual. Se o projeto prioritario nao fosse o ultimo atualizado, ou se nao houvesse briefing, o dashboard podia manter:

- progresso 0%;
- projeto `--`;
- status `--`;
- prazo `--`;
- sem cartao de aprovacao.

Consulta nova:

```js
supabaseClient
  .from("projects")
  .select("*")
  .eq("client_id", profile.client_id)
  .order("updated_at", { ascending: false });
```

Nao usa `email` como criterio principal e nao usa `single()`, `maybeSingle()` ou `limit(1)` para a lista completa.

### Cliente com dois projetos

Antes: o dashboard escolhia apenas o ultimo projeto carregado.

Agora:

- carrega todos os projetos do `client_id`;
- renderiza todos em `Meus Projetos`;
- escolhe um `Projeto Atual` por prioridade:
  1. `awaiting_client_approval`
  2. `changes_requested`
  3. `in_progress`
  4. `internal_review`
  5. `draft`
  6. `approved`
  7. `completed`

### Cartao de aprovacao

Agora todos os projetos com `status = awaiting_client_approval` geram cartao de aprovacao com:

- nome;
- progresso;
- prazo;
- data de solicitacao;
- descricao/orientacao;
- Visualizar Projeto;
- Solicitar Alteracoes;
- Aprovar Projeto.

`preview_url` so gera link quando for URL valida `http` ou `https`.

### Comentarios de projeto

Comentarios novos de projeto usam:

- `project_id`;
- `client_id`;
- `author_user_id`;
- `author_role`;
- `comment_type`;
- `message`.

O dashboard do cliente carrega historico por:

```js
.eq("project_id", projeto.id)
.eq("client_id", projeto.client_id)
```

Comentarios por `briefing_id` ficam apenas como fallback legado.

## SQL aplicado/preparado

Migration atualizada:

- `supabase/migrations/20260721090000_studio_project_approval_flow.sql`

Inclui:

- `public.projects`;
- `public.project_comments`;
- `public.project_uploads`;
- bucket privado `project-files`;
- policies de `projects`;
- policies de `project_comments`;
- policies de `project_uploads`;
- policies de `storage.objects`;
- RPC `approve_studio_project(project_id)`;
- RPC `request_studio_project_changes(project_id, message)`;
- triggers de normalizacao e protecao.

## Upload

Bucket:

- `project-files`

Tabela:

- `public.project_uploads`

Path novo:

```text
clients/{client_id}/projects/{project_id-ou-general}/{uuid}-{nome-sanitizado}
```

Melhorias:

- nome sanitizado;
- UUID no nome final;
- metadados com `client_id` e `project_id`;
- listagem por `client_id`, com fallback legado por `user_id`;
- diagnostico temporario por etapa em `console.error("Falha no upload", ...)`;
- compensacao: se o Storage upload passar e o INSERT dos metadados falhar, o arquivo e removido do bucket.

Etapas diagnosticadas:

- `validation`;
- `load_project`;
- `storage_upload`;
- `signed_url`;
- `metadata_insert`;
- `load_history_by_client`;
- `load_history_by_user`.

## Cache

Cache busting atualizado para:

```text
v=20260721-6
```

Arquivos com import/versionamento atualizado:

- `studio/dashboard.html`
- `studio/admin.html`
- `studio/briefing.html`
- `studio/script.js`
- `studio/js/main.js`
- imports de `admin.js`, `dashboard.js`, `comments.js`, `realtime.js`, `uploads.js`, `briefing.js`

## Arquivos alterados

- `studio/dashboard.html`
- `studio/admin.html`
- `studio/briefing.html`
- `studio/script.js`
- `studio/js/main.js`
- `studio/js/dashboard.js`
- `studio/js/comments.js`
- `studio/js/uploads.js`
- `supabase/migrations/20260721090000_studio_project_approval_flow.sql`
- `docs/sql/HOTFIX-3-2-2-DUARTE-DIAGNOSTICO.sql`
- `docs/DOZEDEV-STUDIO-HOTFIX-3-2-2.md`

## Dados Duarte

Valores esperados depois da validacao/correcao manual no banco real:

- Cliente: Duarte Transporte
- Projeto: Site Duarte Transporte
- Tipo: Website institucional
- Status: `awaiting_client_approval`
- Progresso: `90`
- Preview URL: `https://angelosantos824.github.io/duartejr/`

O hotfix nao executa INSERT duplicado. O SQL de diagnostico deve indicar se ha:

- cliente Duarte duplicado;
- profile com `client_id` diferente do projeto;
- projeto vinculado ao client errado;
- `preview_url` ausente;
- status/progresso divergentes.

## Testes executados localmente

- `Get-Content studio/js/dashboard.js | node --input-type=module --check`
- `Get-Content studio/js/uploads.js | node --input-type=module --check`
- `Get-Content studio/js/comments.js | node --input-type=module --check`
- `Get-Content studio/js/main.js | node --input-type=module --check`
- `deno fmt --check supabase/migrations/20260721090000_studio_project_approval_flow.sql docs/sql/HOTFIX-3-2-2-DUARTE-DIAGNOSTICO.sql`

## Pendencias

- Executar `docs/sql/HOTFIX-3-2-2-DUARTE-DIAGNOSTICO.sql` no banco real.
- Confirmar se ha duplicidade de cliente Duarte.
- Confirmar e, se necessario, corrigir manualmente o vinculo `profiles.client_id = projects.client_id`.
- Aplicar migration no ambiente de homologacao.
- Testar com sessao real do Duarte:
  - lista de todos os projetos;
  - projeto atual por prioridade;
  - cartao de aprovacao;
  - visualizar projeto;
  - solicitar alteracoes;
  - resposta admin;
  - aprovar projeto.
- Testar upload real JPG, PNG e PDF.
- Testar isolamento com outro cliente.

## Decisao

NAO APROVADO PARA DEPLOY DE HOMOLOGACAO

Motivo: o codigo e o SQL estao preparados e os checks locais passaram, mas o requisito do hotfix exige diagnostico baseado no banco real. Esse diagnostico ainda precisa ser executado antes da aprovacao.
