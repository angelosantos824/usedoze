# DOZEDEV Studio - Auditoria Tecnica

Data: 2026-07-17

## Escopo Auditado

- Projeto principal DOZEDEV em `studio/`.
- Paginas: `login.html`, `dashboard.html`, `briefing.html`, `admin.html`.
- Modulos: `auth.js`, `dashboard.js`, `briefing.js`, `admin.js`, `vouchers.js`, `comments.js`, `uploads.js`, `realtime.js`, `notifications.js`, `main.js`.
- Configuracao Supabase: `studio/config.js`.
- Migrations locais existentes: `supabase/migrations/20260711120000_dozedev_control_center.sql`.

Nao foram auditados diretamente dados reais do banco, RLS em producao, Storage em producao ou Edge Functions, porque nao foi feita conexao administrativa ao Supabase nesta fase.

## Resumo Executivo

O DOZEDEV Studio atual esta funcional como prototipo baseado principalmente na tabela `briefings`, mas nao possui uma camada consistente de dados para clientes, projetos e mensagens. O cadastro cria `auth.users` e tenta criar `public.profiles`, porem nao cria `public.clients` nem executa a operacao de forma transacional. O painel administrativo mostra clientes e projetos derivados de `briefings`, nao das tabelas reais de cliente/projeto. A area do cliente filtra dados por email, o que e fragil e aumenta o risco de dados orfaos ou leitura incorreta.

## Inventario Tecnico

### Frontend Studio

- `studio/script.js`: carrega dinamicamente `./js/main.js`.
- `studio/js/main.js`: inicializa todos os modulos em todas as paginas; cada modulo depende de checagens por existencia de elementos.
- `studio/config.js`: cria `globalThis.supabaseClient` com `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
- `studio/js/auth.js`: login, logout, protecao de paginas, cadastro e protecao admin.
- `studio/js/admin.js`: painel administrativo baseado em `briefings` e `vouchers`.
- `studio/js/dashboard.js`: area do cliente baseada em `briefings.email`.
- `studio/js/briefing.js`: envio de briefing e consumo de voucher.
- `studio/js/vouchers.js`: criar voucher simples, validar e alternar ativo/inativo.
- `studio/js/comments.js`: mensagens implementadas como `project_comments` por `briefing_id`.
- `studio/js/uploads.js`: upload em bucket `project-files` e metadados em `project_uploads`.
- `studio/js/realtime.js`: realtime para notifications, project_comments, briefings e vouchers.

### Banco Conforme Migrations Locais

A migration local existente cria a area global de gestao nova (`admin_profiles`, `clients`, `systems`, `plans`, `deployments`, `deployment_history`, `support_notes`). Ela nao define as tabelas antigas do Studio (`profiles`, `briefings`, `vouchers`, `project_comments`, `notifications`, `project_uploads`) que o frontend usa.

Isso indica que o schema real do Studio antigo existe fora das migrations locais versionadas, ou esta incompleto no repositorio.

## Achados

| Prioridade | Problema | Pagina afetada | Arquivo relacionado | Causa provavel | Risco | Correcao proposta | Status |
|---|---|---|---|---|---|---|---|
| Critico | Cadastro pode criar Auth sem perfil ou cliente | `studio/login.html` | `studio/js/auth.js` | `signUp` e `insert profiles` sao passos separados; erro do insert nao impede mensagem de sucesso; `clients` nao e criado | Utilizador autentica e recebe "perfil nao encontrado"; dados orfaos | Criar RPC transacional ou Edge Function para criar Auth/profile/client; registrar falhas e impedir sucesso parcial | Diagnosticado |
| Critico | Area do cliente filtra projetos por email | `studio/dashboard.html` | `studio/js/dashboard.js`, `studio/js/comments.js` | Consultas usam `briefings.email = session.user.email` | Leitura incorreta se email mudar/duplicar; RLS dificil de garantir | Migrar para vinculo por `profile_id` ou `client_id`; centralizar contexto do utilizador | Diagnosticado |
| Critico | Clientes no admin nao vem de `public.clients` | `studio/admin.html` | `studio/js/admin.js` | `carregarAdminClientes()` deduplica emails de `briefings` | Cliente recem-cadastrado sem briefing nao aparece | Usar `public.clients` como fonte primaria; relacionar com profile/briefings/projetos | Diagnosticado |
| Critico | Projetos nao possuem entidade propria | `studio/admin.html`, `studio/dashboard.html` | `studio/js/admin.js`, `studio/js/dashboard.js` | "Projetos" sao `briefings` com status | Projeto pode ficar orfao e sem contrato de dados | Criar ou mapear tabela real de projetos; vincular `client_id`, `profile_id`, briefing e voucher | Diagnosticado |
| Alto | Botao "Novo Projeto" sem fluxo implementado | `studio/admin.html` | `studio/admin.html`, `studio/js/admin.js` | Existe `#novoProjetoBtn`, mas nao ha listener encontrado | Admin nao consegue criar projeto manualmente | Implementar modal/form com cliente, briefing, voucher, status, valor, prazo e validacoes | Diagnosticado |
| Alto | Mensagens sao comentarios de briefing, nao sistema robusto | `studio/dashboard.html`, `studio/admin.html` | `studio/js/comments.js` | Usa `project_comments` por `briefing_id`; nao ha receiver, read_at, status ou project_id | Mensagens podem falhar ou ficar sem destinatario claro | Propor tabela `messages` ou evoluir `project_comments` com remetente/destinatario/status | Diagnosticado |
| Alto | Admin responde procurando cliente por email | `studio/admin.html` | `studio/js/comments.js` | Busca `profiles.email = briefing.email` | Notificacao falha se email divergir ou profile nao existir | Usar `profile_id`/`client_id` no briefing/projeto | Diagnosticado |
| Alto | Upload no briefing nao envia arquivos | `studio/briefing.html` | `studio/js/briefing.js`, `studio/js/uploads.js` | Dropzone so pre-visualiza; submit do briefing nao processa `briefingFiles` | Cliente pensa que enviou anexos, mas arquivos nao chegam | Integrar upload ao submit ou bloquear com mensagem clara | Diagnosticado |
| Alto | Uploads nao vinculam projeto/briefing/cliente | `studio/dashboard.html`, `studio/admin.html` | `studio/js/uploads.js` | `project_uploads` grava `user_id`, email e caminho apenas | Dificulta auditoria, permissao e organizacao por projeto | Adicionar `client_id`, `project_id`/`briefing_id`, validacao de tipo/tamanho e path seguro | Diagnosticado |
| Alto | Storage depende de policies nao versionadas | Uploads | `studio/js/uploads.js` | Bucket `project-files` nao aparece nas migrations locais | Risco de acesso cruzado ou bloqueio silencioso | Versionar policies do bucket e testar RLS entre dois clientes | Diagnosticado |
| Alto | Vouchers sem edicao, exclusao/cancelamento, copia, QR ou compartilhamento | `studio/admin.html`, briefing | `studio/js/vouchers.js` | Modulo atual so cria codigo aleatorio simples e alterna `ativo` | Funcionalidades obrigatorias ausentes | Implementar status, validade, cliente, beneficio, auditoria, copiar, WhatsApp, email, QR/card SVG/PNG | Diagnosticado |
| Alto | Codigo de voucher pode colidir | Admin vouchers | `studio/js/vouchers.js` | `Math.random()` com 4 digitos e sem retry em conflito | Codigo duplicado ou insert falha | Gerar codigo com maior entropia e constraint unica; retry controlado | Diagnosticado |
| Medio | Erros genericos e logs inconsistentes | Todas | Varios JS | `console.error` direto e alerts/toasts variados | Dificulta suporte e mascara falhas | Criar helper `logStudioError({ modulo, acao, error })` com prefixo `DOZEDEV_STUDIO_ERROR` | Diagnosticado |
| Medio | Toast nao existe em algumas paginas | Varias | `studio/js/notifications.js`, HTMLs | `mostrarToast` retorna se nao houver `#toastContainer`; algumas paginas podem nao ter container | Erro/sucesso invisivel | Garantir container global ou fallback visual | Diagnosticado |
| Medio | Inicializacao carrega todos os modulos em todas as paginas | Todas | `studio/js/main.js` | Inicializacao global com guardas por elemento | Mais superficie para side effects e consultas desnecessarias | Inicializar por pagina atual e modulo necessario | Diagnosticado |
| Medio | Admin permite delete fisico de briefing | `studio/admin.html` | `studio/js/admin.js` | Botao Excluir executa `.delete()` | Perda de historico e relacoes | Preferir soft delete/status cancelado/arquivado com log | Diagnosticado |
| Medio | Realtime admin chama `carregarVouchers()` em vez de admin vouchers | `studio/admin.html` | `studio/js/realtime.js` | Handler de `vouchers` atualiza lista cliente `#voucherList`, nao tabela ativa | UI admin pode ficar desatualizada | Chamar `carregarAdminVouchers()` quando secao ativa for vouchers | Diagnosticado |
| Medio | Nome do cliente vem de briefing, nao profile/client | `studio/dashboard.html` | `studio/js/dashboard.js` | `carregarSidebarUser()` consulta `briefings.nome` por email | Fallback errado e nome desatualizado | Criar `getCurrentStudioUser()` buscando `profiles` e `clients` | Diagnosticado |
| Medio | HTML com textos corrompidos por encoding | Varias | HTML/JS/CSS Studio | Caracteres aparecem como `Ã£`, `Ã§`, etc. | UX ruim e mensagens pouco profissionais | Normalizar encoding UTF-8 e revisar textos | Diagnosticado |
| Baixo | `notifications.js` delega para `window.carregarNotificacoes` inexistente | Dashboard | `studio/js/notifications.js` | Funcao externa capturada antes de existir | Notificacoes podem nao carregar | Implementar consulta real a `notifications` | Diagnosticado |
| Baixo | `clients` da area global nova nao e usado pelo Studio antigo | Admin/Cliente | `studio/js/admin.js`, migration global | Duas arquiteturas paralelas | Dados duplicados e confusao operacional | Definir contrato: Studio antigo deve ler/escrever `public.clients` ou manter tabela propria documentada | Diagnosticado |

## Diagnosticos SQL Propostos

Nao executar automaticamente. Usar no Supabase SQL Editor para confirmar estrutura real.

```sql
-- Utilizadores Auth sem profile
select u.id, u.email, u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Profiles sem cliente por email
select p.id, p.email, p.role
from public.profiles p
left join public.clients c on lower(trim(c.email)) = lower(trim(p.email))
where coalesce(p.role, 'client') = 'client'
  and c.id is null;

-- Clientes duplicados por email
select lower(trim(email)) as email_normalizado, count(*)
from public.clients
where email is not null
group by lower(trim(email))
having count(*) > 1;

-- Briefings sem profile por email
select b.id, b.email, b.created_at
from public.briefings b
left join public.profiles p on lower(trim(p.email)) = lower(trim(b.email))
where b.email is not null
  and p.id is null;

-- Uploads sem usuario Auth correspondente
select pu.id, pu.user_id, pu.email, pu.nome_arquivo
from public.project_uploads pu
left join auth.users u on u.id = pu.user_id
where u.id is null;
```

## Migration Proposta Para Proxima Fase

Nao criada nesta fase para respeitar a ordem de execucao. Recomendacao tecnica: usar uma RPC transacional `public.register_studio_client(...)` ou uma Edge Function com service role no backend. O frontend nao consegue criar `auth.users`, `profiles` e `clients` de forma atomica e segura sozinho.

Itens esperados na migration futura:

- Constraint unica em `profiles.email`, se ainda nao existir.
- Constraint unica ou indice unico normalizado em `clients.email`, se aplicavel.
- Relacao explicita entre `profiles` e `clients` (`profile_id` ou `auth_user_id`).
- Campo de vinculo em `briefings` (`profile_id` e/ou `client_id`).
- Campo de vinculo em `project_uploads` (`client_id`, `briefing_id` ou `project_id`).
- Tabela `messages` ou evolucao controlada de `project_comments`.
- Policies RLS para admin/client por UUID, nao por email.

## Premissas da Fase 2

A Fase 2 deve definir uma arquitetura orientada a dominio, nao apenas organizada por paginas ou funcionalidades do frontend. O DOZEDEV Studio deve ser tratado como nucleo do ecossistema DOZEDEV, com modulos reutilizaveis por produtos atuais e futuros como DOZECLIN, DOZEMEC, DOZEIRON, DOZEEAT, DOZEPLAY, DOZETV e outros.

Dominios de negocio esperados:

- Clientes: cadastro, perfis, empresas, contatos, contratos e produtos contratados.
- Projetos: briefings, projetos, tarefas, cronograma, arquivos e aprovacoes.
- Comunicacao: mensagens, notificacoes, comentarios e historico.
- Financeiro: vouchers, orcamentos, faturas, pagamentos e cobrancas.
- Plataforma: produtos, permissoes, auditoria, configuracoes e integracoes.

Sempre que duas funcionalidades representarem a mesma entidade com tabelas diferentes, a Fase 2 deve propor uma fonte oficial de dados, uma estrategia de compatibilidade e uma migracao sem perda de informacao.

A Fase 2 tambem deve entregar `docs/DOZEDEV-STUDIO-ROADMAP.md` contendo:

- arquitetura final proposta;
- modulos existentes;
- modulos futuros;
- dependencias entre modulos;
- ordem ideal de implementacao;
- modulos reutilizaveis por todos os produtos DOZEDEV;
- backlog tecnico da plataforma.

## Plano Tecnico Proposto

1. Congelar contrato de dados do Studio: `profiles`, `clients`, `briefings`, `projects`, `vouchers`, `messages`, `project_uploads`.
2. Criar diagnostico SQL e migration transacional para reparar orfaos.
3. Corrigir cadastro para nao reportar sucesso parcial.
4. Centralizar contexto do utilizador autenticado em um helper reutilizavel.
5. Migrar leituras do cliente de email para UUID/relacionamentos.
6. Corrigir admin Clientes para usar `public.clients`.
7. Implementar entidade/fluxo de Projetos ou mapear formalmente `briefings` como projetos.
8. Evoluir mensagens com remetente, destinatario, status e leitura.
9. Evoluir vouchers com status, edicao, cancelamento, copia, compartilhamento e QR/card.
10. Endurecer uploads e policies de Storage.
11. Padronizar logs `DOZEDEV_STUDIO_ERROR` e mensagens amigaveis.
12. Revisar visual/responsivo apos correcoes funcionais.

## Riscos Restantes

- Estrutura real do banco do Studio antigo nao esta versionada nas migrations locais.
- Sem auditoria SQL real, nao e possivel confirmar policies, triggers e Storage.
- Corrigir apenas frontend pode mascarar problema de RLS ou dados orfaos.
- A area global nova `admin/` e o Studio antigo `studio/` usam modelos diferentes; a integracao precisa de decisao arquitetural antes de refatoracao ampla.

## Confirmacoes

- Nenhum ficheiro do DOZECLIN foi alterado nesta fase.
- Nenhuma migration foi criada ou alterada nesta fase.
- Nenhum SQL foi aplicado.
- Nenhum commit foi feito.
- Nenhum push foi feito.
