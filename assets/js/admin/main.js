import { requireAdmin, initLogin } from "./auth.js";
import { initDashboard } from "./dashboard.js";
import { initCrudPage } from "./crud.js";
import { initDeployments } from "./deployments.js";
import { initUsers } from "./utilizadores.js";
import { initSettings } from "./configuracoes.js";

const page = document.body.dataset.adminPage;
const permissions = {
  dashboard: "dashboard.read",
  clientes: "clients.read",
  sistemas: "systems.read",
  implantacoes: "deployments.read",
  planos: "plans.read",
  utilizadores: "admin_profiles.read",
  configuracoes: "dashboard.read"
};

async function boot() {
  if (page === "login") {
    initLogin();
    return;
  }

  const context = await requireAdmin(permissions[page]);
  if (!context) return;

  if (page === "dashboard") await initDashboard(context);
  if (["clientes", "sistemas", "planos"].includes(page)) await initCrudPage(page, context);
  if (page === "implantacoes") await initDeployments(context);
  if (page === "utilizadores") await initUsers(context);
  if (page === "configuracoes") initSettings(context);
}

boot().catch((error) => {
  console.error(error);
});
