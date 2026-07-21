# DOZEDEV Studio - Sprint 3.1.1 - Homologacao Final

Data: 2026-07-18

## Regras Da Homologacao

- Nao alterar codigo.
- Nao alterar migrations.
- Nao alterar Edge Function.
- Nao alterar RLS.
- Nao alterar arquitetura.
- Nao alterar feature flags.
- Nao fazer commit.
- Nao fazer push.
- Executar os testes manualmente no navegador.

## Preparacao

- [ ] PASSOU [ ] FALHOU - Abrir o navegador com DevTools ativo.
  Resultado esperado: abas Console e Network visiveis.

- [ ] PASSOU [ ] FALHOU - Confirmar que a URL usada e a do ambiente correto.
  Resultado esperado: ambiente DOZEDEV pretendido para homologacao.

- [ ] PASSOU [ ] FALHOU - Preparar um email novo e exclusivo para o teste.
  Resultado esperado: email ainda inexistente em Auth, profiles e clients.

- [ ] PASSOU [ ] FALHOU - Anotar o email de teste usado.
  Resultado esperado: email registrado para consulta posterior.

## Cenario 1 - Cadastro V2

- [ ] PASSOU [ ] FALHOU - Abrir a tela de login/cadastro do Studio.
  Resultado esperado: tela carrega sem erros no Console.

- [ ] PASSOU [ ] FALHOU - Abrir o modal de cadastro.
  Resultado esperado: formulario `registerForm` aparece.

- [ ] PASSOU [ ] FALHOU - Confirmar renderizacao do Turnstile.
  Resultado esperado: widget Cloudflare Turnstile visivel no formulario.

- [ ] PASSOU [ ] FALHOU - Resolver o desafio Turnstile.
  Resultado esperado: desafio concluido sem erro visual.

- [ ] PASSOU [ ] FALHOU - Preencher nome, email novo e senha.
  Resultado esperado: campos preenchidos corretamente.

- [ ] PASSOU [ ] FALHOU - Submeter o cadastro.
  Resultado esperado: botao fica desativado durante o envio.

- [ ] PASSOU [ ] FALHOU - Confirmar chamada para `register-studio-client`.
  Resultado esperado: Network mostra chamada da Edge Function com sucesso.

- [ ] PASSOU [ ] FALHOU - Confirmar mensagem apresentada ao utilizador.
  Resultado esperado: mensagem amigavel de conta criada ou verificacao de email.

- [ ] PASSOU [ ] FALHOU - Confirmar envio do email de verificacao.
  Resultado esperado: email recebido na caixa de entrada ou spam.

- [ ] PASSOU [ ] FALHOU - Confirmar criacao em `auth.users`.
  Resultado esperado: utilizador existe com o email de teste.

- [ ] PASSOU [ ] FALHOU - Confirmar criacao em `public.profiles`.
  Resultado esperado: profile existe com `id` igual ao Auth UID.

- [ ] PASSOU [ ] FALHOU - Confirmar criacao em `public.clients`.
  Resultado esperado: client existe para o cadastro comercial.

- [ ] PASSOU [ ] FALHOU - Confirmar vinculo `profiles.client_id`.
  Resultado esperado: `profiles.client_id` igual ao `clients.id` criado.

- [ ] PASSOU [ ] FALHOU - Confirmar criacao em `public.audit_logs`.
  Resultado esperado: logs de criacao de profile, client e associacao.

- [ ] PASSOU [ ] FALHOU - Confirmar que o log nao contem dados sensiveis.
  Resultado esperado: nenhum password, token, service role ou secret em `audit_logs`.

- [ ] PASSOU [ ] FALHOU - Confirmar reset do Turnstile apos sucesso.
  Resultado esperado: token nao reutilizavel e widget pronto para novo desafio.

## Cenario 2 - Login

- [ ] PASSOU [ ] FALHOU - Confirmar o email do novo utilizador.
  Resultado esperado: email verificado com sucesso.

- [ ] PASSOU [ ] FALHOU - Efetuar login com o novo utilizador.
  Resultado esperado: login concluido sem erro.

- [ ] PASSOU [ ] FALHOU - Validar carregamento do profile.
  Resultado esperado: profile localizado por Auth UID.

- [ ] PASSOU [ ] FALHOU - Validar carregamento do client.
  Resultado esperado: client localizado via `profiles.client_id`.

- [ ] PASSOU [ ] FALHOU - Confirmar carregamento da area do cliente.
  Resultado esperado: dashboard abre normalmente.

- [ ] PASSOU [ ] FALHOU - Confirmar ausencia de erros no Console.
  Resultado esperado: nenhum erro JavaScript, Supabase ou RLS.

- [ ] PASSOU [ ] FALHOU - Confirmar ausencia de dependencia operacional por email.
  Resultado esperado: profile/client carregam por UUID; qualquer uso legado de email deve ser anotado.

## Cenario 3 - Duplicidade

- [ ] PASSOU [ ] FALHOU - Abrir novamente o cadastro.
  Resultado esperado: formulario carrega normalmente.

- [ ] PASSOU [ ] FALHOU - Resolver novo desafio Turnstile.
  Resultado esperado: novo token gerado.

- [ ] PASSOU [ ] FALHOU - Tentar cadastrar novamente o mesmo email.
  Resultado esperado: cadastro recusado com mensagem amigavel.

- [ ] PASSOU [ ] FALHOU - Confirmar que nenhum novo Auth foi criado.
  Resultado esperado: apenas um registro em `auth.users` para o email.

- [ ] PASSOU [ ] FALHOU - Confirmar que nenhum novo Profile foi criado.
  Resultado esperado: apenas um registro em `public.profiles` para o email.

- [ ] PASSOU [ ] FALHOU - Confirmar que nenhum novo Client foi criado.
  Resultado esperado: apenas um registro em `public.clients` para o email.

- [ ] PASSOU [ ] FALHOU - Confirmar reset do Turnstile apos erro.
  Resultado esperado: token anterior nao e reutilizado.

## Cenario 4 - Compensacao

Nao executar automaticamente. Preparar ambiente controlado antes.

- [ ] PASSOU [ ] FALHOU - Definir um teste seguro para provocar falha da RPC.
  Resultado esperado: falha controlada depois da criacao do Auth e antes da conclusao de profile/client.

- [ ] PASSOU [ ] FALHOU - Executar o cadastro de teste de compensacao.
  Resultado esperado: Edge Function tenta criar Auth e RPC falha.

- [ ] PASSOU [ ] FALHOU - Confirmar que o Auth criado nessa execucao foi removido.
  Resultado esperado: nenhum `auth.users` orfao para o email do teste.

- [ ] PASSOU [ ] FALHOU - Confirmar que nenhum Profile parcial permaneceu.
  Resultado esperado: nenhum `public.profiles` para o email do teste.

- [ ] PASSOU [ ] FALHOU - Confirmar que nenhum Client parcial permaneceu.
  Resultado esperado: nenhum `public.clients` para o email do teste.

- [ ] PASSOU [ ] FALHOU - Confirmar log de falha/compensacao.
  Resultado esperado: `audit_logs` registra compensacao executada ou pendente.

- [ ] PASSOU [ ] FALHOU - Confirmar que utilizador pre-existente nao foi removido.
  Resultado esperado: compensacao atua somente sobre Auth criado naquela execucao.

## Cenario 5 - Isolamento

- [ ] PASSOU [ ] FALHOU - Entrar com Cliente A.
  Resultado esperado: sessao autenticada comum do Cliente A.

- [ ] PASSOU [ ] FALHOU - Entrar com Cliente B em outro navegador/perfil.
  Resultado esperado: sessao autenticada comum do Cliente B.

- [ ] PASSOU [ ] FALHOU - Cliente A tenta visualizar dados do Cliente B.
  Resultado esperado: acesso bloqueado por RLS ou ausencia de dados retornados.

- [ ] PASSOU [ ] FALHOU - Cliente B tenta visualizar dados do Cliente A.
  Resultado esperado: acesso bloqueado por RLS ou ausencia de dados retornados.

- [ ] PASSOU [ ] FALHOU - Cliente A tenta alterar o proprio `client_id`.
  Resultado esperado: banco rejeita a alteracao.

- [ ] PASSOU [ ] FALHOU - Cliente A tenta alterar o proprio `role`.
  Resultado esperado: banco rejeita a alteracao.

- [ ] PASSOU [ ] FALHOU - Cliente comum tenta acessar `audit_logs`.
  Resultado esperado: acesso bloqueado ou zero registros retornados.

- [ ] PASSOU [ ] FALHOU - Cliente comum tenta executar `create_studio_client_profile`.
  Resultado esperado: permissao negada.

## Decisao Manual

- [ ] PASSOU [ ] FALHOU - Todos os cenarios obrigatorios passaram.
  Resultado esperado: Sprint pronta para recomendacao de ativacao controlada de `clientFoundationV2`.

- [ ] PASSOU [ ] FALHOU - Foi documentado qualquer uso legado de email encontrado.
  Resultado esperado: pendencias registradas para sprint futura, sem bloquear a fundacao se nao afetarem cadastro/login V2.
