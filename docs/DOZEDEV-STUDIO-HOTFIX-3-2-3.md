# DOZEDEV Studio - HOTFIX 3.2.3

Data: 2026-07-21

## Escopo

Separar definitivamente briefing e projeto no Studio.

Nao foram alterados:

- autenticacao;
- confirmacao de email;
- Turnstile;
- Resend;
- uploads corrigidos no Hotfix 3.2.2;
- DOZECLIN;
- schema `dozeclin`;
- dados do Duarte.

## Diagnostico confirmado

Uploads funcionam apos o Hotfix 3.2.2.

O Duarte possui:

- profile correto;
- `client_id` correto;
- uploads visiveis;
- briefings recebidos pelo admin.

O Duarte nao possui registro em `public.projects`.

Causa do painel do cliente mostrar progresso `0%`, projeto `--`, status `--` e nenhum cartao de aprovacao:

- o admin alterava status/andamento em `public.briefings`;
- o dashboard do cliente le `public.projects`;
- briefing nao deve ser fonte principal do andamento do projeto.

## Solucao

### Conversao de briefing em projeto

Foi adicionada acao administrativa:

- `Converter em Projeto`

Ela:

- recebe `briefing_id`;
- localiza o briefing;
- localiza o `client_id` por `briefings.client_id`, `profiles.email` ou `clients.email`;
- nao cria cliente;
- impede duplicidade por `projects.briefing_id`;
- abre o formulario de projeto preenchido;
- cria registro real em `public.projects`.

O projeto do Duarte nao e inserido automaticamente pela migration.

### Atualizacoes de projeto

Foi adicionada tabela incremental:

- `public.project_updates`

Uso:

- admin publica atualizacoes no modal de edicao de projeto;
- a atualizacao e salva em `project_updates`;
- `projects.progress`, `projects.status` e `projects.updated_at` continuam sendo a fonte do estado atual;
- cliente visualiza atualizacao mais recente e historico no dashboard.

### Dashboard do cliente

O dashboard agora:

- carrega projetos por `projects.client_id = profiles.client_id`;
- mostra projeto atual por prioridade de status;
- mostra `Nenhum projeto ativo` quando nao ha projeto;
- nao usa `briefings.status` como andamento do projeto;
- exibe `Acompanhamento do Projeto` a partir de `project_updates`;
- renderiza aprovacao somente quando `projects.status = awaiting_client_approval`.

## Migration

Arquivo:

- `supabase/migrations/20260721103000_studio_project_updates_and_briefing_conversion.sql`

Inclui:

- `projects.briefing_id uuid`;
- indice unico parcial para impedir mais de um projeto por briefing;
- tabela `public.project_updates`;
- trigger de normalizacao de `project_updates`;
- RLS:
  - cliente seleciona somente atualizacoes do proprio `client_id`;
  - admin Studio cria, edita, visualiza e remove atualizacoes;
- grants para `authenticated`.

## Arquivos alterados

- `studio/admin.html`
- `studio/dashboard.html`
- `studio/briefing.html`
- `studio/script.js`
- `studio/js/main.js`
- `studio/js/admin.js`
- `studio/js/dashboard.js`
- `supabase/migrations/20260721103000_studio_project_updates_and_briefing_conversion.sql`
- `docs/DOZEDEV-STUDIO-HOTFIX-3-2-3.md`

## Cache

Versionamento atualizado para:

```text
v=20260721-7
```

## Testes executados localmente

- `Get-Content studio/js/admin.js | node --input-type=module --check`
- `Get-Content studio/js/dashboard.js | node --input-type=module --check`
- `Get-Content studio/js/main.js | node --input-type=module --check`
- `deno fmt --check supabase/migrations/20260721103000_studio_project_updates_and_briefing_conversion.sql`
- `git diff --check`
- `rg -n "dozeclin|DOZECLIN" studio supabase/migrations/20260721103000_studio_project_updates_and_briefing_conversion.sql docs/DOZEDEV-STUDIO-HOTFIX-3-2-3.md`
- `rg -n "RESEND_API_KEY|TURNSTILE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|service_role|sk_[A-Za-z0-9]|eyJ[A-Za-z0-9_-]{20,}" studio supabase/migrations/20260721103000_studio_project_updates_and_briefing_conversion.sql docs/DOZEDEV-STUDIO-HOTFIX-3-2-3.md`

Resultado da varredura de secrets: nenhum secret novo. O unico JWT encontrado continua sendo a anon key publica em `studio/config.js`.

## Testes pendentes apos aplicar migration

- briefing chega ao admin;
- admin converte briefing em projeto;
- projeto aparece no painel do cliente;
- admin publica atualizacao;
- cliente ve o que esta pronto;
- cliente ve progresso e status;
- cliente abre `preview_url`;
- cliente solicita alteracao;
- admin responde no projeto;
- resposta aparece para o cliente;
- cliente aprova;
- outro cliente nao ve o projeto do Duarte;
- briefing e projeto continuam separados.

## Decisao

APROVADO PARA APLICACAO DA MIGRATION
