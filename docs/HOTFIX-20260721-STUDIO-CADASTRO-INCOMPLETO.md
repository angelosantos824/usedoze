# HOTFIX 2026-07-21 - Cadastro incompleto do DOZEDEV Studio

## Decisao

**NAO APROVADO PARA DEPLOY DO HOTFIX**

Motivo: o bloqueio preventivo e as correcoes de frontend foram aplicados e validados localmente por sintaxe/servidor, mas nao foi possivel executar a homologacao obrigatoria com token Turnstile real nem confirmar os dados de producao em `auth.users`, `public.profiles`, `public.clients` e `public.audit_logs`.

## Causa raiz

O formulario de cadastro ainda tinha um caminho legado com `supabase.auth.signUp()`. Com `clientFoundationV2` desligado, esse caminho podia criar `auth.users` antes de concluir a camada de dados do Studio, deixando utilizadores sem `public.profiles`, sem `public.clients` e sem `profiles.client_id`.

O painel administrativo de clientes tambem lia clientes a partir de `briefings`, nao de `public.clients`. Assim, um cliente com cadastro novo completo poderia nao aparecer se ainda nao tivesse briefing.

O dashboard do cliente usava nome vindo de `briefings`, o que favorecia fallback generico quando o perfil/vinculo real estava ausente.

## Fluxo antigo encontrado

- `studio/js/auth.js`: fluxo legado com `supabaseClient.auth.signUp(...)`.
- `studio/js/auth.js`: fluxo V2 com `supabaseClient.functions.invoke("register-studio-client", ...)`.
- `studio/js/features.js`: `clientFoundationV2` so pode ser ligado em host local via query/localStorage.

## Correcao aplicada

- Bloqueado o cadastro legado quando `clientFoundationV2` esta falso.
- Mensagem temporaria exibida ao utilizador: "O cadastro esta temporariamente em manutencao. Entre em contato com o suporte DOZEDEV."
- Mantido login de utilizadores existentes.
- Turnstile renderiza sob demanda quando o modal abre, com retry enquanto o script ainda nao carregou.
- Tentativas pendentes de renderizacao do Turnstile sao canceladas quando o modal fecha.
- Admin Clientes agora consulta `public.clients`.
- Contador de clientes do admin agora usa `public.clients`.
- Sidebar/topbar do dashboard agora carregam identidade via `public.profiles` com relacionamento `profiles.client_id -> clients.id`.
- Adicionado SQL de diagnostico sem escrita em `docs/sql/HOTFIX-20260721-STUDIO-CADASTRO-DIAGNOSTICO.sql`.

## Arquivos alterados

- `studio/js/auth.js`
- `studio/js/admin.js`
- `studio/js/dashboard.js`
- `docs/sql/HOTFIX-20260721-STUDIO-CADASTRO-DIAGNOSTICO.sql`

Observacao: o working tree ja tinha outras alteracoes pendentes antes deste hotfix, incluindo `studio/config.js`, `studio/login.html`, docs e Supabase migrations/functions.

## Evidencias locais

- `node --input-type=module --check` passou para:
  - `studio/js/auth.js`
  - `studio/js/admin.js`
  - `studio/js/dashboard.js`
- `deno check supabase/functions/register-studio-client/index.ts` passou.
- Servidor local Vite em `http://127.0.0.1:5173/`.
- `GET http://127.0.0.1:5173/studio/login.html` retornou `200`.
- `studio/login.html` contem `#turnstileContainer`.
- `studio/login.html` carrega `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`.

## Evidencias nao obtidas

- Diagnostico real de `admin@teste.com` em producao.
- Lista real de `auth.users` sem `profiles`.
- Confirmacao de `audit_logs` relacionados em producao.
- Cadastro local com email novo e token Turnstile real.
- Evidencia do novo cliente aparecendo no painel com dados reais.
- Evidencia do dashboard pos-login com dados reais associados ao `client_id`.

## Contas orfas

Nao listadas automaticamente. O script seguro para listar foi preparado em:

`docs/sql/HOTFIX-20260721-STUDIO-CADASTRO-DIAGNOSTICO.sql`

Esse script consulta `information_schema` primeiro e depois lista `auth.users` sem `public.profiles`, sem corrigir ou excluir dados.

## Plano seguro de reparacao individual

1. Executar o SQL de diagnostico em producao.
2. Confirmar para cada email: `auth.users.id`, `profiles.id`, `profiles.client_id`, `clients.id` e auditoria.
3. Classificar cada caso como:
   - Auth sem profile.
   - Profile sem client.
   - Profile com `client_id` quebrado.
   - Duplicado por email.
4. Reparar um email por vez somente apos validar identidade, consentimento operacional e ausencia de duplicidade.
5. Registrar toda reparacao em `public.audit_logs`.
6. Nunca apagar `auth.users` existentes neste hotfix.

## Risco de ativacao

Ativar `clientFoundationV2` em producao antes de homologar Turnstile, Edge Function, RPC, RLS e auditoria pode bloquear cadastros legitimos ou criar falhas de suporte. Manter desligado globalmente ate o teste completo.
