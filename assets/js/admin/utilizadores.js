import { friendlyPermissions, permissionsByRole, roleLabels } from "./permissions.js";
import { getSupabase } from "./supabase-admin.js";
import { el, renderTable, setLoading, statusPill, t } from "./ui.js";

export async function initUsers() {
  const root = document.getElementById("usersRoot");
  if (!root) return;
  setLoading(root);

  const { data, error } = await getSupabase()
    .from("admin_profiles")
    .select("id, name, email, role, status, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  root.textContent = "";
  const permissions = el("section", { className: "admin-card full" });
  permissions.appendChild(el("h2", { text: "Perfis e permissoes" }));
  Object.entries(permissionsByRole).forEach(([role, grants]) => {
    permissions.appendChild(el("p", {
      className: "admin-muted",
      text: `${roleLabels[role]}: ${grants.includes("*") ? "Acesso completo" : grants.map((grant) => friendlyPermissions[grant]).join(", ")}`
    }));
  });

  const tableSlot = el("div");
  renderTable(tableSlot, [
    { label: "Nome", key: "name" },
    { label: "Email", key: "email" },
    { label: "Perfil", render: (row) => t("roles", row.role) },
    { label: "Estado", render: (row) => statusPill(row.status) }
  ], data || [], "Sem utilizadores administrativos.");
  root.append(permissions, tableSlot);
}
