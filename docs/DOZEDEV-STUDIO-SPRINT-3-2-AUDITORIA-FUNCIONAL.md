# DOZEDEV Studio - Sprint 3.2 - Auditoria Funcional

Data: 2026-07-21

## Escopo

Auditoria e correcao dos fluxos internos do DOZEDEV Studio apos homologacao do cadastro V2, Turnstile, confirmacao por email, login, dashboard e painel administrativo.

Nao foram alterados:

- autenticacao;
- Turnstile;
- Resend;
- Edge Functions;
- DOZECLIN;
- schema `dozeclin`.

## Tabelas e bucket utilizados

- `public.clients`: fonte oficial de clientes no admin.
- `public.profiles`: identidade autenticada e vinculo `profiles.client_id`.
- `public.briefings`: briefings e fallback visual para projetos quando `public.projects` nao estiver disponivel.
- `public.projects`: primeira opcao para criacao de novo projeto quando a tabela existir no ambiente.
- `public.project_uploads`: metadados de arquivos enviados.
- `public.vouchers`: vouchers.
- `public.audit_logs`: auditoria best effort para criacao de projeto.
- Storage bucket `project-files`: bucket privado utilizado para documentos de projeto.

## Inventario de acoes

| Pagina | Acao | Seletor | JS responsavel | Estado anterior | Estado atual |
| --- | --- | --- | --- | --- | --- |
| `studio/briefing.html` | Enviar Briefing | `#briefingForm` | `studio/js/briefing.js` | Inseria dados sem `client_id`, permitia duplo envio e tinha confirmacao fraca | Valida campos, exige sessao/profile/client_id, desativa botao, grava com vinculos quando suportado, mostra toast solicitado e redireciona ao dashboard |
| `studio/briefing.html` | Voucher | `input[name="tipoProjeto"]`, `#acceptVoucherRules`, `#cancelVoucherRules` | `studio/js/briefing.js`, `studio/js/vouchers.js` | Funcional | Mantido |
| `studio/briefing.html` | Upload no briefing | `#uploadDropzone`, `#briefingFiles` | `studio/js/uploads.js` | Preview local apenas | Mantido como selecao/preview; envio principal continua no dashboard |
| `studio/dashboard.html` | Dashboard | `href="#dashboardTop"` | ancora HTML | Funcional | Mantido |
| `studio/dashboard.html` | Novo Briefing | `href="briefing.html"` | navegacao HTML | Funcional | Mantido |
| `studio/dashboard.html` | Meus Projetos | `href="#briefingsSection"` | `studio/js/dashboard.js` | Buscava briefings por email | Agora prefere `client_id` e usa email apenas como fallback legado |
| `studio/dashboard.html` | Uploads | `href="#uploadsSection"` | ancora HTML | Funcional | Mantido |
| `studio/dashboard.html` | Suporte | `href="#supportSection"` | `studio/js/comments.js` | Buscava briefing atual por email | Agora prefere `client_id` e usa fallback por email |
| `studio/dashboard.html` | Enviar Arquivos | `#clienteUploadInput` | `studio/js/uploads.js` | Sem validacao robusta, path por user id, metadados sem `client_id`, botao Ver usava dataset errado | Valida tipo/tamanho, usa nome seguro, path por `clients/{client_id}`, grava metadados com `client_id`, bloqueia duplo envio, mostra estado/sucesso/erro |
| `studio/dashboard.html` | Ver arquivo | `.visualizarArquivoBtn` | `studio/js/uploads.js` | Usava `dataset.nome`/`dataset.tipo`, retornando `undefined` | Usa `dataset.name`/`dataset.type` e signed URL privada |
| `studio/dashboard.html` | Download arquivo | `.baixarArquivoBtn` | `studio/js/uploads.js` | Funcional basico | Mantido com tratamento de erro |
| `studio/dashboard.html` | Sair | `#logoutBtn` | `studio/js/auth.js` | Funcional | Mantido |
| `studio/admin.html` | Dashboard | `a[data-section="dashboard"]` | `studio/js/admin.js` | Funcional | Mantido |
| `studio/admin.html` | Clientes | `a[data-section="clientes"]` | `studio/js/admin.js` | Listava `public.clients`, mas botao Ver estava desativado | Botao Ver ativo com modal de detalhes do cliente |
| `studio/admin.html` | Ver cliente | `.verClienteBtn` | `studio/js/admin.js` | Botao criado com `disabled = true` e sem listener de cliente | Modal mostra dados cadastrais, profile, briefings/projetos, uploads e vouchers do cliente selecionado |
| `studio/admin.html` | Briefings | `a[data-section="briefings"]` | `studio/js/admin.js` | Funcional | Mantido |
| `studio/admin.html` | Projetos | `a[data-section="projetos"]` | `studio/js/admin.js` | Base visual em `briefings` | Mantido como visual atual; Novo Projeto tenta `projects` primeiro e cai para `briefings` se necessario |
| `studio/admin.html` | Uploads | `a[data-section="uploads"]` | `studio/js/uploads.js` | Funcional basico | Mantido com preview/download privado |
| `studio/admin.html` | Novo Projeto | `#novoProjetoBtn` | `studio/js/admin.js` | Sem listener | Abre modal, exige cliente, cria projeto vinculado a `client_id`, atualiza painel e registra auditoria best effort |
| `studio/admin.html` | Gerar Voucher | `#gerarVoucherBtn` | `studio/js/vouchers.js` | Funcional | Mantido |
| `studio/admin.html` | Sair | `#logoutBtn` | `studio/js/auth.js` | Funcional | Mantido |

## Causas corrigidas

1. Briefing nao tinha vinculo forte com cliente.
   - Causa: `briefing.js` montava payload apenas com campos do formulario e email.
   - Correcao: busca `profiles.id` e `profiles.client_id`; insere `user_id`, `profile_id` e `client_id` quando suportado.

2. Briefing podia ser enviado mais de uma vez.
   - Causa: botao permanecia ativo durante o insert.
   - Correcao: botao e bloqueado durante envio e reabilitado apenas no fim do fluxo.

3. Confirmacao de briefing era fraca ou invisivel.
   - Causa: mensagem generica e ausencia de `#toastContainer` em `briefing.html`.
   - Correcao: toast container adicionado e mensagem oficial aplicada.

4. Upload nao vinculava corretamente ao cliente.
   - Causa: path e metadados baseados em `user_id`/email.
   - Correcao: path privado por `clients/{client_id}` e metadados com `client_id`, `profile_id`, bucket e path quando suportado.

5. Botao Ver de upload do cliente falhava.
   - Causa: o botao gravava `data-name`/`data-type`, mas lia `dataset.nome`/`dataset.tipo`.
   - Correcao: leitura ajustada para `dataset.name`/`dataset.type`.

6. Botao Ver cliente no admin nao funcionava.
   - Causa: botao era renderizado desativado e reutilizava classe de briefing sem listener apropriado.
   - Correcao: criado `.verClienteBtn` e modal dedicado.

7. Novo Projeto nao fazia nada.
   - Causa: `#novoProjetoBtn` nao tinha listener.
   - Correcao: modal e submit implementados com `client_id` obrigatorio.

## Arquivos alterados

- `studio/admin.html`
- `studio/briefing.html`
- `studio/dashboard.html`
- `studio/css/components.css`
- `studio/js/admin.js`
- `studio/js/briefing.js`
- `studio/js/comments.js`
- `studio/js/dashboard.js`
- `studio/js/main.js`
- `studio/js/uploads.js`
- `studio/script.js`
- `docs/DOZEDEV-STUDIO-SPRINT-3-2-AUDITORIA-FUNCIONAL.md`

## Testes executados

Checks locais:

- `Get-Content studio/js/briefing.js | node --input-type=module --check`
- `Get-Content studio/js/uploads.js | node --input-type=module --check`
- `Get-Content studio/js/admin.js | node --input-type=module --check`
- `Get-Content studio/js/dashboard.js | node --input-type=module --check`
- `Get-Content studio/js/comments.js | node --input-type=module --check`
- `Get-Content studio/js/main.js | node --input-type=module --check`
- `Get-Content studio/script.js | node --input-type=module --check`
- `git diff --check`

Validacoes manuais ainda necessarias na homologacao:

- enviar briefing com cliente real e confirmar aparicao no admin;
- enviar arquivo real e confirmar visualizacao/download no cliente e no admin;
- criar projeto para cliente real e confirmar registro em `projects` ou fallback em `briefings`;
- testar dois clientes diferentes para confirmar isolamento por `client_id`;
- testar erro de rede no upload;
- testar arquivo maior que 20 MB;
- testar tipo nao permitido.

## Pendencias

- Confirmar em producao se `public.projects` esta disponivel e com as colunas planejadas. O codigo ja tenta `projects` primeiro e usa `briefings` como fallback de compatibilidade.
- Confirmar policies do bucket `project-files` para acesso privado por cliente/admin.
- Normalizar textos corrompidos por charset em Sprint separada, pois esta correcao evitou mexer em layout e conteudo fora do fluxo funcional.

## Decisao

APROVADO PARA HOMOLOGACAO INTERNA
