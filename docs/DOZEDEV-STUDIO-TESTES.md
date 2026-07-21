# DOZEDEV Studio - Checklist Manual de Testes

Data: 2026-07-17

## Preparacao

- Confirmar projeto Supabase correto em `studio/config.js`.
- Abrir DevTools com Console e Network visiveis.
- Usar pelo menos duas contas cliente diferentes e uma conta admin.
- Testar em desktop e mobile.
- Nao usar dados ficticios para mascarar falhas.

## Autenticacao e Cadastro

- [ ] Criar conta cliente pelo modal de registro.
- [ ] Confirmar que `auth.users` foi criado.
- [ ] Confirmar que `public.profiles` foi criado com mesmo UUID do Auth.
- [ ] Confirmar `profiles.role = client` ou regra equivalente.
- [ ] Confirmar que `public.clients` foi criado ou associado.
- [ ] Confirmar que email duplicado nao cria cliente duplicado.
- [ ] Simular falha no profile/client e confirmar que a UI nao mostra sucesso.
- [ ] Login com credenciais validas redireciona corretamente.
- [ ] Login com senha errada mostra mensagem amigavel.
- [ ] Logout encerra sessao.
- [ ] Sessao expirada redireciona para login sem loop.

## Sprint 3.1 - Fundacao

- [ ] Executar diagnostico SQL antes da migration.
- [ ] Confirmar estrutura real de `profiles`.
- [ ] Confirmar estrutura real de `clients`.
- [ ] Confirmar duplicados por email.
- [ ] Confirmar utilizadores Auth sem profile.
- [ ] Confirmar profiles sem client.
- [ ] Confirmar clients sem associacao.
- [ ] Confirmar dados do cliente Duarte Transporte.
- [ ] Aplicar migration apenas em ambiente controlado.
- [ ] Configurar `SUPABASE_SERVICE_ROLE_KEY` somente na Edge Function.
- [ ] Testar cadastro com `clientFoundationV2: false`.
- [ ] Testar cadastro com `clientFoundationV2: true`.
- [ ] Confirmar criacao de Auth, profile e client.
- [ ] Confirmar `profiles.client_id`.
- [ ] Confirmar auditoria sem senha/token/chave.
- [ ] Simular falha da RPC e confirmar compensacao do Auth.
- [ ] Executar backfill duas vezes e confirmar idempotencia.
- [ ] Confirmar rollback funcional desligando `clientFoundationV2`.

## Sprint 3.1.1 - Hardening

- [ ] Confirmar que `PUBLIC`, `anon` e `authenticated` nao executam `create_studio_client_profile(...)`.
- [ ] Confirmar que apenas `service_role` executa `create_studio_client_profile(...)`.
- [ ] Confirmar que cliente nao altera `profiles.role`.
- [ ] Confirmar que cliente nao altera `profiles.client_id`.
- [ ] Confirmar que cliente nao altera `profiles.id`.
- [ ] Confirmar que cliente nao altera `profiles.created_at`.
- [ ] Confirmar que insert legado exige `client_id is null`.
- [ ] Confirmar que insert legado nao aceita `role = admin`.
- [ ] Confirmar que cadastro duplicado por email retorna erro controlado.
- [ ] Confirmar que duas tentativas simultaneas nao criam duplicidade.
- [ ] Confirmar CORS sem wildcard em producao.
- [ ] Confirmar Turnstile com token invalido bloqueia cadastro quando `TURNSTILE_REQUIRED=true`.
- [ ] Confirmar que `clientFoundationV2` permanece `false` ate validacao completa.
- [ ] Confirmar que Auth existente sem profile/client gera caso de reconciliacao.
- [ ] Confirmar que compensacao remove apenas Auth criado na propria execucao.
- [ ] Confirmar que falha da compensacao gera auditoria `register_compensation_pending`.
- [ ] Confirmar que o fluxo legado nao mostra sucesso quando `profiles.insert` falha.

## Area do Cliente

- [ ] Nome no topo mostra nome do profile ou client.
- [ ] Avatar mostra inicial correta.
- [ ] Sidebar mostra nome/empresa/email corretos.
- [ ] Fallback "Cliente DOZEDEV" aparece apenas sem dados reais.
- [ ] Cliente ve apenas seus proprios briefings/projetos.
- [ ] Cliente A nao consegue ver dados do Cliente B manipulando URL/IDs.
- [ ] Cards de projeto, status, prazo e voucher carregam dados reais.
- [ ] Timeline reflete status correto.
- [ ] Progresso reflete status correto.

## Briefings e Projetos

- [ ] Criar briefing normal.
- [ ] Criar briefing com voucher valido.
- [ ] Briefing fica vinculado ao profile/client correto.
- [ ] Briefing aparece no dashboard do cliente correto.
- [ ] Briefing aparece no admin.
- [ ] Botao "Novo Projeto" abre formulario/modal.
- [ ] Lista de clientes carrega no novo projeto.
- [ ] Criar projeto com cliente, prazo, status, descricao, valor e responsavel.
- [ ] Projeto aparece no admin sem reload manual.
- [ ] Projeto aparece para o cliente correto.
- [ ] Projeto nao fica orfao sem client/profile.

## Admin - Clientes

- [ ] Lista usa `public.clients` ou fonte oficial definida.
- [ ] Cliente recem-cadastrado aparece mesmo sem briefing.
- [ ] Mostra nome, empresa, email, status, data de cadastro e origem.
- [ ] Busca por nome funciona.
- [ ] Busca por empresa funciona.
- [ ] Busca por email funciona.
- [ ] Filtro por status funciona.
- [ ] Estado vazio e claro.
- [ ] Erro de consulta aparece na UI.

## Vouchers

- [ ] Criar voucher com codigo unico.
- [ ] Criar voucher vinculado a cliente.
- [ ] Criar voucher sem vinculo inicial.
- [ ] Definir tipo de servico, beneficio, validade, limite e status.
- [ ] Editar validade.
- [ ] Editar status.
- [ ] Editar limite.
- [ ] Editar observacoes.
- [ ] Editar cliente/beneficio.
- [ ] Copiar voucher gera texto formatado para WhatsApp/email.
- [ ] Enviar por WhatsApp abre `https://wa.me/?text=...`.
- [ ] Enviar por email abre `mailto:` com assunto e corpo.
- [ ] Cancelar/excluir pede confirmacao com codigo.
- [ ] Voucher usado nao e apagado fisicamente; fica cancelado/revogado.
- [ ] Lista atualiza sem recarregar pagina.

## QR Code e Validacao de Voucher

- [ ] Gerar `voucher-qr.svg`.
- [ ] Gerar `voucher-card.svg`.
- [ ] Card contem identidade DOZEDEV, codigo, beneficio, validade, QR, selo e dominio.
- [ ] Card nao contem dados sensiveis.
- [ ] Baixar SVG funciona.
- [ ] Baixar PNG funciona.
- [ ] Copiar codigo funciona.
- [ ] Copiar link funciona.
- [ ] Link publico mostra voucher valido.
- [ ] Link publico mostra voucher expirado.
- [ ] Link publico mostra voucher utilizado.
- [ ] Link publico mostra voucher cancelado.
- [ ] Link publico mostra voucher inexistente.

## Mensagens

- [ ] Cliente envia mensagem ao administrador.
- [ ] Texto nao se perde se envio falhar.
- [ ] Botao fica bloqueado durante envio.
- [ ] Mensagem aparece em ordem cronologica.
- [ ] Mostra remetente.
- [ ] Mostra data/hora.
- [ ] Admin responde.
- [ ] Cliente recebe resposta.
- [ ] Status lida/nao lida funciona.
- [ ] HTML da mensagem e escapado.
- [ ] Nao ha envio duplicado.
- [ ] Erro real aparece no console como `DOZEDEV_STUDIO_ERROR`.

## Uploads

- [ ] Cliente envia arquivo permitido.
- [ ] Tipo nao permitido e bloqueado.
- [ ] Tamanho acima do limite e bloqueado.
- [ ] Nome do arquivo e sanitizado.
- [ ] Metadado e gravado em `project_uploads`.
- [ ] Upload fica vinculado a cliente/projeto/briefing correto.
- [ ] Cliente visualiza seu arquivo.
- [ ] Cliente baixa seu arquivo.
- [ ] Admin visualiza arquivo.
- [ ] Admin baixa arquivo.
- [ ] Cliente A nao acessa arquivo do Cliente B.
- [ ] Link assinado expira corretamente.
- [ ] Erro de Storage aparece com mensagem amigavel.

## Permissoes e RLS

- [ ] Admin visualiza todos os clientes.
- [ ] Admin cria projetos.
- [ ] Admin gere vouchers.
- [ ] Admin visualiza briefings.
- [ ] Admin responde mensagens.
- [ ] Admin gere uploads.
- [ ] Cliente visualiza apenas seus dados.
- [ ] Cliente cria briefing.
- [ ] Cliente envia mensagens.
- [ ] Cliente envia arquivos.
- [ ] Cliente usa voucher permitido.
- [ ] Usuario autenticado comum nao le dados de outro cliente.
- [ ] Usuario anonimo nao acessa dados privados.

## Erros, Logs e UX

- [ ] Console usa prefixo `DOZEDEV_STUDIO_ERROR` para erros tratados.
- [ ] Mensagem amigavel aparece na UI.
- [ ] Detalhes internos do banco nao aparecem para utilizador final.
- [ ] Loading aparece durante consultas longas.
- [ ] Botoes desativam durante submits.
- [ ] Modais fecham corretamente.
- [ ] Layout funciona em mobile.
- [ ] Textos com acentos aparecem corretamente.

## Validacao Estatica

- [ ] `node --check studio/config.js`
- [ ] Validar JS modular com `node --input-type=module --check`.
- [ ] `git diff --check`
- [ ] `supabase db lint`, quando ambiente Supabase CLI estiver configurado.

## Criterio de Aceite

- [ ] Novos clientes nao geram registros orfaos.
- [ ] Clientes aparecem no painel administrativo.
- [ ] Nome do cliente aparece corretamente.
- [ ] Novo projeto funciona.
- [ ] Projetos aparecem para o cliente correto.
- [ ] Mensagens sao enviadas e recebidas.
- [ ] Vouchers podem ser criados, copiados, compartilhados e cancelados.
- [ ] Cartao de voucher com QR Code existe.
- [ ] WhatsApp e email funcionam.
- [ ] Uploads estao seguros.
- [ ] RLS foi validada com dois clientes.
- [ ] Erros sao visiveis e trataveis.
