# DOZEDEV Studio - Sprint 3.2.1 - Aprovacao de Projetos

Data: 2026-07-21

## Diagnostico do schema atual

Diagnostico feito a partir do repositorio local e das migrations versionadas:

- Nao havia migration local criando `public.projects`.
- `public.projects` aparecia em documentacao e ja era tentada pelo frontend da Sprint 3.2, mas sem contrato versionado no banco.
- `project_comments` existia como tabela legada do Studio, usada por `briefing_id`.
- Comentarios do cliente/admin usavam `public.project_comments` filtrando `briefing_id`.
- O dashboard do cliente ainda carregava projetos principalmente por `briefings`, com fallback por email quando `client_id` nao estava disponivel.
- O admin criava projeto tentando `projects`, mas ainda tinha fallback de escrita em `briefings`.
- Nao havia suporte versionado para `preview_url`, `approval_requested_at`, `approved_at` e `approved_by`.
- Nao havia comentarios de projeto com `project_id` e `client_id` como vinculos obrigatorios do novo fluxo.

Nao foi executada consulta direta no banco de producao nesta etapa; a migration criada e incremental e usa `create table if not exists` e `add column if not exists`.

## Migration criada

Arquivo:

- `supabase/migrations/20260721090000_studio_project_approval_flow.sql`

Implementa:

- `public.projects`
- normalizacao incremental de colunas em `public.projects`
- evolucao incremental de `public.project_comments`
- indices por `client_id`, `status`, `project_id` e datas
- triggers:
  - `set_projects_updated_at`
  - `prevent_project_client_protected_update`
  - `normalize_project_comment`
- RLS para projetos e comentarios
- auditoria controlada em `audit_logs`

## Tabelas e policies utilizadas

### `public.projects`

Campos suportados:

- `id`
- `client_id`
- `name`
- `service_type`
- `description`
- `status`
- `progress`
- `preview_url`
- `repository_url`
- `deadline`
- `approval_requested_at`
- `approved_at`
- `approved_by`
- `created_at`
- `updated_at`

Status internos:

- `draft`
- `in_progress`
- `internal_review`
- `awaiting_client_approval`
- `changes_requested`
- `approved`
- `completed`
- `cancelled`

Policies:

- cliente ve apenas projetos do seu `client_id`;
- admin Studio ve todos;
- admin cria/edita todos;
- cliente so atualiza projeto proprio em aprovacao e apenas para aprovar ou solicitar alteracoes;
- trigger bloqueia alteracao cliente em campos protegidos como progresso, URL, prazo e cliente.

### `public.project_comments`

Campos novos:

- `project_id`
- `client_id`
- `author_profile_id`
- `author_user_id`
- `author_role`
- `comment_type`
- `message`
- `created_at`

Campos legados preservados:

- `briefing_id`
- `user_id`
- `user_nome`
- `mensagem`
- `criado_em`

Tipos:

- `message`
- `change_request`
- `admin_response`
- `approval`

## Arquivos alterados

- `supabase/migrations/20260721090000_studio_project_approval_flow.sql`
- `studio/admin.html`
- `studio/dashboard.html`
- `studio/briefing.html`
- `studio/script.js`
- `studio/js/admin.js`
- `studio/js/dashboard.js`
- `studio/js/comments.js`
- `studio/js/realtime.js`
- `studio/js/main.js`
- `docs/DOZEDEV-STUDIO-SPRINT-3-2-1-APROVACAO-PROJETOS.md`

## Fluxo implementado

### Admin

- Aba Projetos passa a carregar `public.projects`.
- Novo Projeto cria em `public.projects`, sem fallback de escrita em `briefings`.
- Formulario permite:
  - cliente;
  - nome;
  - tipo de servico;
  - descricao;
  - status;
  - progresso;
  - prazo;
  - URL de visualizacao;
  - URL do repositorio.
- `awaiting_client_approval` exige `preview_url`.
- Edicao de projeto existente permite alterar os mesmos campos.
- Modal de projeto mostra historico de `project_comments`.
- Admin pode responder dentro do projeto; resposta grava `project_comments` com:
  - `project_id`;
  - `client_id`;
  - `author_role = admin`;
  - `comment_type = admin_response`.

### Cliente

- Dashboard busca projeto real por `profiles.client_id`.
- Quando o projeto esta em `awaiting_client_approval`, mostra cartao destacado:
  - nome;
  - status;
  - progresso;
  - prazo;
  - data de solicitacao;
  - botao Visualizar Projeto;
  - botao Aprovar Projeto;
  - botao Solicitar Alteracoes.
- Visualizar Projeto abre `preview_url` com `target="_blank"` e `rel="noopener noreferrer"`.
- Aprovar Projeto:
  - pede confirmacao;
  - atualiza status para `approved`;
  - preenche `approved_at`;
  - preenche `approved_by`;
  - grava comentario `approval`;
  - registra auditoria best effort;
  - mostra "Projeto aprovado com sucesso."
- Solicitar Alteracoes:
  - abre modal;
  - exige descricao;
  - grava comentario `change_request`;
  - atualiza status para `changes_requested`;
  - registra auditoria best effort;
  - mostra "Pedido de alteracoes enviado com sucesso."

### Comentarios

- Comentarios de projeto agora usam `project_id` e `client_id`.
- Comentarios legados de briefing continuam legiveis quando nao ha projeto real.
- Realtime do cliente assina `project_comments` por `project_id` quando existe projeto real.

## Caso Duarte Transporte

O admin consegue cadastrar:

- Cliente: Duarte Transporte
- Projeto: Site Duarte Transporte
- Tipo: Website institucional
- Status: `awaiting_client_approval`
- Progresso: `90`
- URL de visualizacao: `https://angelosantos824.github.io/duartejr/`

## Testes executados

Checks locais:

- `Get-Content studio/js/admin.js | node --input-type=module --check`
- `Get-Content studio/js/dashboard.js | node --input-type=module --check`
- `Get-Content studio/js/comments.js | node --input-type=module --check`
- `Get-Content studio/js/realtime.js | node --input-type=module --check`
- `Get-Content studio/js/main.js | node --input-type=module --check`

## Pendencias de homologacao

- Aplicar migration em ambiente de homologacao/producao.
- Validar schema real apos migration via `information_schema`.
- Criar projeto Duarte Transporte pelo admin.
- Confirmar que Duarte visualiza apenas o projeto dele.
- Confirmar que outro cliente nao consegue ler/alterar o projeto pelo console.
- Confirmar que o botao Visualizar abre a URL correta.
- Confirmar pedido de alteracoes e resposta admin no historico do projeto.
- Confirmar aprovacao e bloqueio de nova aprovacao pelo cliente.
- Confirmar RLS de `projects` e `project_comments` em ambiente real.

## Decisao

APROVADO PARA HOMOLOGACAO INTERNA
