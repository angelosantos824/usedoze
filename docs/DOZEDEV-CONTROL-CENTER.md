# DOZEDEV Control Center

Documento tecnico da primeira etapa da plataforma administrativa DOZEDEV.

## Entidades

- `admin_profiles`: perfis administrativos ligados ao Supabase Auth.
- `systems`: catalogo dos produtos DOZEDEV.
- `clients`: clientes e leads.
- `plans`: planos por sistema.
- `deployments`: implantacoes de sistemas para clientes.
- `deployment_history`: historico de alteracoes de estado.
- `support_notes`: base preparada para notas e suporte.

## Relacionamentos

- `plans.system_id` referencia `systems.id`.
- `deployments.client_id` referencia `clients.id`.
- `deployments.system_id` referencia `systems.id`.
- `deployments.plan_id` referencia `plans.id`.
- `deployment_history.deployment_id` referencia `deployments.id`.
- `support_notes.client_id` referencia `clients.id`.
- `support_notes.deployment_id` referencia `deployments.id`.

## Estados

Sistemas:

- `development`: Em desenvolvimento.
- `beta`: Em beta.
- `available`: Disponivel.
- `maintenance`: Em manutencao.
- `discontinued`: Descontinuado.

Clientes:

- `lead`: Lead.
- `active`: Ativo.
- `suspended`: Suspenso.
- `cancelled`: Cancelado.

Implantacoes:

- `provisioning`: Em provisionamento.
- `active`: Ativo.
- `suspended`: Suspenso.
- `maintenance`: Em manutencao.
- `cancelled`: Cancelado.

Planos:

- `active`: Ativo.
- `inactive`: Inativo.

## Regras de negocio

- O site publico permanece independente e funcional.
- A area administrativa exige Supabase Auth.
- Nao ha exclusao definitiva de clientes na interface nesta etapa.
- Clientes devem ser suspensos ou cancelados por estado.
- O codigo interno e o slug de sistemas nao devem ser alterados pela interface depois de criados.
- Precos iniciais dos planos de exemplo ficam em `0` e descricao `A definir`.
- Nenhuma chave privada deve ser usada no navegador.

## Fluxo de criacao de cliente

1. Utilizador autorizado abre `admin/clientes.html`.
2. Preenche dados basicos do cliente.
3. Escolhe tipo e estado.
4. O frontend grava em `clients`.
5. RLS valida se o perfil pode criar clientes.

## Fluxo de criacao de implantacao

1. Utilizador autorizado abre `admin/implantacoes.html`.
2. Seleciona cliente, sistema e plano.
3. Informa nome da instancia, ambiente, versao e estado inicial.
4. O frontend grava em `deployments`.
5. A implantacao fica vinculada por foreign keys.

## Fluxo de alteracao de estado

1. Utilizador autorizado escolhe uma implantacao.
2. Informa o novo estado.
3. Informa o motivo da alteracao.
4. O frontend atualiza `deployments.status`.
5. O frontend cria um registo em `deployment_history` com estado anterior, novo estado, motivo e utilizador.

## Regras de acesso

- `super_admin`: acesso completo.
- `admin`: acesso a clientes, sistemas e implantacoes.
- `suporte`: leitura de clientes, sistemas e implantacoes.
- `financeiro`: acesso a planos e informacoes comerciais, sem exclusao de clientes.
- `comercial`: acesso a clientes, planos e novas implantacoes.

As politicas RLS estao definidas na migration `20260711120000_dozedev_control_center.sql` e nao criam leitura publica para tabelas administrativas.
