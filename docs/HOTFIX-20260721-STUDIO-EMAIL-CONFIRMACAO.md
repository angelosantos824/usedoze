# HOTFIX 2026-07-21 - Email de confirmacao no cadastro V2 do DOZEDEV Studio

## Decisao

**NAO APROVADO PARA COMMIT E DEPLOY**

Motivo: a implementacao foi preparada e validada por type-check e simulacao local, mas ainda nao foram executados os testes obrigatorios reais de recebimento de email, link valido, preenchimento de `email_confirmed_at`, bloqueio antes da confirmacao e login apos confirmacao.

## Causa confirmada

A Edge Function `register-studio-client` usava:

```ts
supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: false,
  ...
})
```

Esse caminho criava `auth.users`, `public.profiles`, `public.clients` e `audit_logs`, mas nao iniciava um envio de email de confirmacao.

Nao havia geracao de link de confirmacao nem chamada para provedor de email.

## Solucao escolhida

Para cadastro novo:

- substituir a criacao direta por `supabase.auth.admin.generateLink({ type: "signup", ... })`;
- manter a criacao de `auth.users` via Admin API;
- preservar a RPC transacional `create_studio_client_profile`;
- extrair `action_link` somente no backend;
- enviar o link via provedor de email configurado por variaveis de ambiente;
- nunca devolver link, token, OTP, hashed token, service role ou secret ao frontend;
- se o envio falhar depois de Auth/Profile/Client criados, manter a conta nao confirmada, auditar a falha e responder com mensagem segura.

Para reenvio:

- nova Edge Function `resend-studio-confirmation`;
- resposta sempre generica;
- busca de utilizador somente no backend com service role;
- envio apenas para conta existente e ainda nao confirmada;
- rate limit simples por IP/email;
- auditoria sem tokens;
- uso de `supabase.auth.resend({ type: "signup" })`, que precisa ser validado no projeto real para contas criadas por Admin API/generateLink.

## Arquivos alterados

- `supabase/functions/register-studio-client/index.ts`
- `supabase/functions/resend-studio-confirmation/index.ts`
- `studio/js/auth.js`
- `studio/login.html`

## Configuracao externa necessaria

Edge Function `register-studio-client`:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO` opcional
- `STUDIO_EMAIL_REDIRECT_TO` opcional, permitido apenas se for uma das URLs aceitas

Supabase Authentication:

- Confirm Email: habilitado.
- Site URL: rota final do Studio.
- Redirect URLs:
  - `http://localhost:5173/studio/login.html`
  - `http://127.0.0.1:5173/studio/login.html`
  - `https://dozedev.pt/studio/login.html`
  - `https://www.dozedev.pt/studio/login.html`

SMTP:

- Nao foi possivel inspecionar a configuracao real do projeto nesta sessao.
- Para producao, nao depender do provedor demonstrativo da Supabase; configurar SMTP/provedor proprio.
- Nenhuma credencial foi inserida no Git.

## Testes executados

- `deno check supabase/functions/register-studio-client/index.ts`: passou.
- `deno check supabase/functions/resend-studio-confirmation/index.ts`: passou.
- `node --input-type=module --check studio/js/auth.js`: passou.
- `GET http://127.0.0.1:5173/studio/login.html`: retornou 200.
- Simulacao local do botao "Reenviar email de confirmacao":
  - chamou `resend-studio-confirmation`;
  - enviou o email preenchido no campo de login;
  - exibiu resposta generica sem enumerar conta.

## Testes pendentes obrigatorios

- Cadastro novo real.
- Email recebido.
- Link valido.
- `email_confirmed_at` preenchido apos clique.
- Login bloqueado antes da confirmacao.
- Login permitido depois da confirmacao.
- Link expirado.
- Reenvio real.
- Reenvio repetido com rate limit.
- Email inexistente sem enumeracao.
- Conta ja confirmada.
- Confirmar que nenhum token/secret/link foi exposto ao frontend ou salvo em auditoria.

## Riscos

- `auth.resend({ type: "signup" })` precisa ser validado no projeto real para utilizadores criados por Admin API/generateLink. A documentacao oficial informa que o reenvio depende de uma solicitacao inicial de signup/email change/phone change.
- Sem SMTP/provedor proprio configurado, emails de auth em producao podem ser limitados ou best-effort.
- Sem teste real do link, nao ha garantia final de que a URL de redirecionamento esteja aceita no painel Supabase.
