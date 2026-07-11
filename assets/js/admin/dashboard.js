import { getSupabase } from "./supabase-admin.js";
import { el, formatDate, renderTable, setLoading, statusPill, t } from "./ui.js";

export async function initDashboard() {
  const root = document.getElementById("dashboardRoot");
  if (!root) return;
  setLoading(root);

  const supabase = getSupabase();
  const today = new Date();
  const next30 = new Date();
  next30.setDate(today.getDate() + 30);

  const [
    clients,
    activeClients,
    systems,
    availableSystems,
    deployments,
    activeDeployments,
    maintenanceDeployments,
    renewals
  ] = await Promise.all([
    count("clients"),
    count("clients", "status", "active"),
    count("systems"),
    count("systems", "status", "available"),
    supabase.from("deployments").select("*, clients(name), systems(name)").order("created_at", { ascending: false }).limit(6),
    count("deployments", "status", "active"),
    count("deployments", "status", "maintenance"),
    supabase.from("deployments").select("*, clients(name), systems(name)").gte("renewal_date", today.toISOString().slice(0, 10)).lte("renewal_date", next30.toISOString().slice(0, 10)).order("renewal_date", { ascending: true }).limit(8)
  ]);

  root.textContent = "";
  root.appendChild(metricsGrid([
    ["Total de clientes", clients],
    ["Clientes ativos", activeClients],
    ["Sistemas disponiveis", availableSystems],
    ["Implantacoes ativas", activeDeployments],
    ["Em manutencao", maintenanceDeployments],
    ["Renovacoes proximas", renewals.data?.length || 0]
  ]));

  const recent = el("section", { className: "admin-card wide" });
  recent.appendChild(el("h2", { text: "Implantacoes recentes" }));
  const recentSlot = el("div");
  recent.appendChild(recentSlot);
  renderTable(recentSlot, deploymentColumns(), deployments.data || [], "Ainda nao existem implantacoes.");

  const renewalCard = el("section", { className: "admin-card wide" });
  renewalCard.appendChild(el("h2", { text: "Renovacoes proximas" }));
  const renewalSlot = el("div");
  renewalCard.appendChild(renewalSlot);
  renderTable(renewalSlot, deploymentColumns(true), renewals.data || [], "Sem renovacoes nos proximos 30 dias.");

  const summary = el("section", { className: "admin-card full" });
  summary.appendChild(el("h2", { text: "Resumo por sistema e estado" }));
  summary.appendChild(await buildSystemSummary());

  root.append(recent, renewalCard, summary);
}

async function count(table, column, value) {
  let query = getSupabase().from(table).select("id", { count: "exact", head: true });
  if (column) query = query.eq(column, value);
  const { count: total, error } = await query;
  if (error) throw error;
  return total || 0;
}

function metricsGrid(items) {
  const grid = el("section", { className: "admin-grid" });
  items.forEach(([label, value]) => {
    grid.appendChild(el("article", { className: "admin-card" }, [
      el("span", { className: "metric-label", text: label }),
      el("strong", { className: "metric-value", text: String(value) })
    ]));
  });
  return grid;
}

function deploymentColumns(includeRenewal = false) {
  const columns = [
    { label: "Instancia", key: "instance_name" },
    { label: "Cliente", render: (row) => row.clients?.name || "A definir" },
    { label: "Sistema", render: (row) => row.systems?.name || "A definir" },
    { label: "Estado", render: (row) => statusPill(row.status) }
  ];

  if (includeRenewal) {
    columns.push({ label: "Renovacao", render: (row) => formatDate(row.renewal_date) });
  }

  return columns;
}

async function buildSystemSummary() {
  const supabase = getSupabase();
  const { data: systems, error } = await supabase
    .from("systems")
    .select("id, name, status, deployments(id, status)")
    .order("name");

  if (error) throw error;

  const slot = el("div", { className: "admin-grid" });
  (systems || []).forEach((system) => {
    const active = (system.deployments || []).filter((item) => item.status === "active").length;
    slot.appendChild(el("article", { className: "admin-card" }, [
      el("span", { className: "metric-label", text: system.name }),
      el("strong", { className: "metric-value", text: String(system.deployments?.length || 0) }),
      el("p", { className: "admin-muted", text: `${active} ativas - ${t("status", system.status)}` })
    ]));
  });
  return slot;
}
