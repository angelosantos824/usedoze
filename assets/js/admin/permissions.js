export const roleLabels = {
  super_admin: "Super administrador",
  admin: "Administrador",
  suporte: "Suporte",
  financeiro: "Financeiro",
  comercial: "Comercial"
};

export const permissionsByRole = {
  super_admin: ["*"],
  admin: [
    "dashboard.read",
    "clients.read",
    "clients.create",
    "clients.update",
    "systems.read",
    "systems.update",
    "deployments.read",
    "deployments.create",
    "deployments.update"
  ],
  suporte: [
    "dashboard.read",
    "clients.read",
    "systems.read",
    "deployments.read"
  ],
  financeiro: [
    "dashboard.read",
    "clients.read",
    "plans.read",
    "plans.create",
    "plans.update"
  ],
  comercial: [
    "dashboard.read",
    "clients.read",
    "clients.create",
    "clients.update",
    "plans.read",
    "deployments.read",
    "deployments.create"
  ]
};

export const friendlyPermissions = {
  "dashboard.read": "Visualizar dashboard",
  "clients.read": "Visualizar clientes",
  "clients.create": "Criar clientes",
  "clients.update": "Editar clientes",
  "systems.read": "Visualizar sistemas",
  "systems.update": "Editar sistemas",
  "plans.read": "Visualizar planos",
  "plans.create": "Criar planos",
  "plans.update": "Editar planos",
  "deployments.read": "Visualizar implantacoes",
  "deployments.create": "Criar implantacao",
  "deployments.update": "Editar implantacoes",
  "admin_profiles.read": "Visualizar utilizadores administrativos",
  "admin_profiles.update": "Editar utilizadores administrativos"
};

export function can(profile, permission) {
  const grants = permissionsByRole[profile?.role] || [];
  return grants.includes("*") || grants.includes(permission);
}
