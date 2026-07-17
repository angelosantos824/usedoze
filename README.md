# DOZEDEV

Site institucional da DOZEDEV.PT com uma fundacao administrativa para gerir clientes, sistemas, planos e implantacoes.

## Objetivo da area administrativa

A nova Area de Gestao centraliza a administracao dos sistemas DOZECLIN, DOZEEAT, DOZEIRON e DOZEPLAY. Nesta etapa foram criadas as bases de autenticacao, paginas protegidas, estrutura de dados Supabase, RLS e modulos principais de gestao.

O site publico continua em HTML, CSS e JavaScript estatico, mantendo paginas institucionais, formularios, estilos e a area Studio existente.

## Arquitetura atual

- Site publico: `index.html`, `servicos.html`, `portfolio.html`, `sobre.html`, `contato.html` e assets em `assets/css`.
- Studio existente: `studio/`, usando Supabase Auth e tabelas ja existentes do Studio.
- Area de Gestao: `admin/`, com paginas HTML protegidas por Supabase Auth.
- JavaScript administrativo: `assets/js/admin/`, separado por autenticacao, UI, dashboard, CRUD, implantacoes e configuracoes.
- Banco: Supabase com migrations em `supabase/migrations/`.

## Estrutura de pastas

```text
admin/
  login.html
  dashboard.html
  clientes.html
  sistemas.html
  implantacoes.html
  planos.html
  utilizadores.html
  configuracoes.html
assets/css/
  admin.css
  admin-responsive.css
assets/js/admin/
  auth.js
  supabase-admin.js
  permissions.js
  ui.js
  dashboard.js
  crud.js
  deployments.js
  utilizadores.js
  configuracoes.js
  main.js
supabase/migrations/
  20260711120000_dozedev_control_center.sql
docs/
  DOZEDEV-CONTROL-CENTER.md
```

## Configuracao do Supabase

A area administrativa reutiliza `studio/config.js`, que cria `supabaseClient` no navegador com a chave publica anon. Nao foi adicionada chave `service_role` ao frontend.

Antes de usar a area administrativa, execute a migration:

```bash
supabase db push
```

Ou aplique o SQL do ficheiro `supabase/migrations/20260711120000_dozedev_control_center.sql` pelo editor SQL do Supabase.

## Autenticacao e perfis

A autenticacao usa Supabase Auth com email e senha. Todas as paginas em `admin/`, exceto `login.html`, verificam sessao e perfil ativo em `admin_profiles`.

Perfis criados:

- `super_admin`: acesso completo.
- `admin`: clientes, sistemas e implantacoes.
- `suporte`: leitura de clientes, sistemas e implantacoes.
- `financeiro`: planos e informacoes comerciais.
- `comercial`: clientes, planos e novas implantacoes.

## Criar o primeiro super_admin

1. Crie o utilizador no Supabase Auth.
2. Copie o UUID do utilizador.
3. Execute:

```sql
insert into admin_profiles (id, name, email, role, status)
values (
  'UUID_DO_UTILIZADOR',
  'Nome do administrador',
  'email@dominio.pt',
  'super_admin',
  'active'
);
```

Depois aceda a `admin/login.html` com o email e senha desse utilizador.

## Funcionalidades implementadas

- Login e logout administrativo.
- Protecao de paginas por sessao.
- RLS e politicas para tabelas administrativas.
- Dashboard com contagens reais do Supabase.
- Gestao basica de clientes.
- Visualizacao e edicao controlada dos sistemas.
- Gestao basica de planos.
- Criacao de implantacoes.
- Alteracao de estado de implantacao com motivo e historico.
- Lista de utilizadores administrativos e permissoes amigaveis.
- Layout responsivo com menu lateral recolhivel.

## Como executar localmente

Como o projeto e estatico, pode abrir os ficheiros HTML diretamente ou servir a pasta com um servidor local:

```bash
npx vite --host 127.0.0.1
```

Depois abra `http://127.0.0.1:5173/admin/login.html`.

## Como testar

- Site publico: abra `index.html`, `servicos.html`, `portfolio.html`, `sobre.html` e `contato.html`.
- Login: aceda a `admin/login.html` sem sessao e confirme que as outras paginas redirecionam para login.
- Dashboard: entre com um perfil administrativo e confirme se os cards carregam dados do Supabase.
- Clientes: crie e edite um cliente.
- Sistemas: confirme os quatro sistemas e edite apenas descricao, versao, estado e URL publica.
- Planos: crie ou edite planos.
- Implantacoes: crie uma implantacao vinculada a cliente, sistema e plano; altere o estado e confirme o historico.

## Funcionalidades futuras

- Modulo completo de suporte.
- Auditoria detalhada por entidade.
- Provisionamento automatizado.
- Integracoes com os sistemas clientes.
- Pagamentos e faturacao, quando autorizados.
