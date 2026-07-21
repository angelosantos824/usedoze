# DOZEDEV Studio - HOTFIX 3.2.4

Data: 2026-07-22

## Escopo

Corrigir visibilidade de briefings legados do cliente Duarte no dashboard e adicionar exclusao controlada de clientes de teste no painel admin.

Nao foram alterados:

- autenticacao;
- Turnstile;
- Resend;
- uploads;
- DOZECLIN;
- schema `dozeclin`;
- `auth.users`.

## Diagnostico

O admin mostra varios briefings de Duarte Transporte, mas o dashboard do cliente podia nao listar esses registros porque a tela do cliente priorizava `briefings.client_id = profiles.client_id`.

Briefings antigos ou duplicados podem ter sido gravados:

- sem `client_id`;
- com email diferente do login atual;
- apenas com `empresa = Duarte Transporte` ou `nome = Uriel Duarte`.

O painel de projetos continuar vazio e esperado enquanto nao existir linha real em `public.projects`.

## Correcao aplicada

### Dashboard do cliente

`carregarBriefingsCliente()` agora combina:

- briefings por `client_id`;
- briefings por email do utilizador autenticado;
- briefings legados por nome exato de empresa/contacto/perfil.

Os resultados sao deduplicados por `briefing.id` e ordenados por `created_at desc`.

### Painel admin

O card `Projetos Ativos` agora conta apenas `public.projects`.

Nao soma mais briefings com status "Em andamento" como se fossem projetos.

### Clientes de teste

Foi adicionado botao `Excluir` na lista de clientes.

Segurancas:

- exige digitar `EXCLUIR`;
- registra auditoria antes da exclusao;
- nao remove `auth.users`;
- delete e permitido apenas para Studio Admin via RLS.

## Migration

Arquivo:

- `supabase/migrations/20260722090000_studio_admin_delete_test_clients.sql`

Inclui:

- policy `clients_delete_studio_admin`;
- `grant delete on public.clients to authenticated`.

## Arquivos alterados

- `studio/admin.html`
- `studio/dashboard.html`
- `studio/briefing.html`
- `studio/script.js`
- `studio/js/main.js`
- `studio/js/admin.js`
- `studio/js/dashboard.js`
- `supabase/migrations/20260722090000_studio_admin_delete_test_clients.sql`
- `docs/DOZEDEV-STUDIO-HOTFIX-3-2-4-DUARTE-BRIEFINGS-CLIENTES-TESTE.md`

## Cache

Versionamento atualizado para:

```text
v=20260722-1
```

## Testes locais

- `Get-Content studio/js/dashboard.js | node --input-type=module --check`
- `Get-Content studio/js/admin.js | node --input-type=module --check`
- `Get-Content studio/js/main.js | node --input-type=module --check`
- `deno fmt --check supabase/migrations/20260722090000_studio_admin_delete_test_clients.sql`

## Pendencia operacional

Para o cliente ver projeto, ainda e necessario criar ou converter um projeto real em `public.projects`. Briefing nao e mais tratado como projeto.

## Decisao

APROVADO PARA APLICACAO DA MIGRATION
