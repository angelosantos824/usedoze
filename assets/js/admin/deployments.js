import { getSupabase } from "./supabase-admin.js";
import { can } from "./permissions.js";
import { el, formatDate, formatDateTime, getFormData, renderTable, setLoading, showToast, statusPill, t } from "./ui.js";

let state = { profile: null, rows: [], clients: [], systems: [], plans: [] };

export async function initDeployments(context) {
  const root = document.getElementById("deploymentsRoot");
  if (!root) return;
  state.profile = context.profile;
  setLoading(root);
  await loadAll();
  render(root);
}

async function loadAll() {
  const supabase = getSupabase();
  const [clients, systems, plans, deployments] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("systems").select("id, name").order("name"),
    supabase.from("plans").select("id, name, system_id").order("name"),
    supabase.from("deployments").select("*, clients(name), systems(name), plans(name)").order("created_at", { ascending: false })
  ]);

  [clients, systems, plans, deployments].forEach((result) => {
    if (result.error) throw result.error;
  });

  state.clients = clients.data || [];
  state.systems = systems.data || [];
  state.plans = plans.data || [];
  state.rows = deployments.data || [];
}

function render(root) {
  root.textContent = "";
  const formSlot = el("div");
  const tableSlot = el("div");
  const canCreate = can(state.profile, "deployments.create");

  const newButton = el("button", {
    className: "btn-admin",
    type: "button",
    text: "Nova implantacao"
  });
  newButton.disabled = !canCreate;
  newButton.addEventListener("click", () => renderForm(formSlot));

  root.append(
    el("section", { className: "toolbar" }, [
      buildFilters(tableSlot),
      newButton
    ]),
    formSlot,
    tableSlot
  );
  renderFilteredTable(tableSlot);
}

function buildFilters(tableSlot) {
  const wrap = el("div", { className: "filters" });
  [
    ["clientFilter", "Todos os clientes", state.clients],
    ["systemFilter", "Todos os sistemas", state.systems]
  ].forEach(([id, label, items]) => {
    const select = el("select", { id });
    select.appendChild(el("option", { value: "", text: label }));
    items.forEach((item) => select.appendChild(el("option", { value: item.id, text: item.name })));
    select.addEventListener("change", () => renderFilteredTable(tableSlot));
    wrap.appendChild(select);
  });

  const env = selectFrom("environmentFilter", "Todos os ambientes", [["development", "Desenvolvimento"], ["staging", "Homologacao"], ["production", "Producao"]]);
  const status = selectFrom("deploymentStatusFilter", "Todos os estados", [["provisioning", "Em provisionamento"], ["active", "Ativo"], ["suspended", "Suspenso"], ["maintenance", "Em manutencao"], ["cancelled", "Cancelado"]]);
  env.addEventListener("change", () => renderFilteredTable(tableSlot));
  status.addEventListener("change", () => renderFilteredTable(tableSlot));
  wrap.append(env, status);
  return wrap;
}

function selectFrom(id, first, options) {
  const select = el("select", { id });
  select.appendChild(el("option", { value: "", text: first }));
  options.forEach(([value, label]) => select.appendChild(el("option", { value, text: label })));
  return select;
}

function filteredRows() {
  const client = document.getElementById("clientFilter")?.value || "";
  const system = document.getElementById("systemFilter")?.value || "";
  const environment = document.getElementById("environmentFilter")?.value || "";
  const status = document.getElementById("deploymentStatusFilter")?.value || "";

  return state.rows.filter((row) => {
    return (!client || row.client_id === client)
      && (!system || row.system_id === system)
      && (!environment || row.environment === environment)
      && (!status || row.status === status);
  });
}

function renderFilteredTable(tableSlot) {
  const columns = [
    { label: "Instancia", key: "instance_name" },
    { label: "Cliente", render: (row) => row.clients?.name || "A definir" },
    { label: "Sistema", render: (row) => row.systems?.name || "A definir" },
    { label: "Plano", render: (row) => row.plans?.name || "A definir" },
    { label: "Ambiente", render: (row) => t("environment", row.environment) },
    { label: "Estado", render: (row) => statusPill(row.status) },
    { label: "Renovacao", render: (row) => formatDate(row.renewal_date) },
    {
      label: "Acoes",
      render: (row) => {
        const actions = el("div", { className: "page-actions" });
        if (row.production_url) {
          actions.appendChild(el("a", { className: "btn-admin secondary", href: row.production_url, target: "_blank", rel: "noreferrer", text: "Abrir URL" }));
        }
        if (can(state.profile, "deployments.update")) {
          const statusButton = el("button", { className: "btn-admin secondary", type: "button", text: "Alterar estado" });
          statusButton.addEventListener("click", () => changeStatus(row));
          actions.appendChild(statusButton);
        }
        const historyButton = el("button", { className: "btn-admin secondary", type: "button", text: "Historico" });
        historyButton.addEventListener("click", () => showHistory(row));
        actions.appendChild(historyButton);
        return actions;
      }
    }
  ];
  renderTable(tableSlot, columns, filteredRows(), "Sem implantacoes encontradas.");
}

function renderForm(container) {
  container.textContent = "";
  const form = el("form", { className: "admin-form" });
  const grid = el("div", { className: "form-grid" });
  grid.append(
    field("client_id", "Cliente", "relation", state.clients),
    field("system_id", "Sistema", "relation", state.systems),
    field("plan_id", "Plano", "relation", state.plans),
    field("instance_name", "Nome da instancia", "text"),
    field("subdomain", "Subdominio", "text"),
    field("production_url", "URL de producao", "url"),
    field("environment", "Ambiente", "select", [["development", "Desenvolvimento"], ["staging", "Homologacao"], ["production", "Producao"]]),
    field("version", "Versao", "text"),
    field("database_provider", "Fornecedor da base de dados", "text"),
    field("database_reference", "Referencia da base de dados", "text"),
    field("status", "Estado inicial", "select", [["provisioning", "Em provisionamento"], ["active", "Ativo"], ["suspended", "Suspenso"], ["maintenance", "Em manutencao"], ["cancelled", "Cancelado"]]),
    field("start_date", "Data de inicio", "date"),
    field("renewal_date", "Data de renovacao", "date"),
    field("notes", "Notas", "textarea")
  );

  form.append(grid, el("button", { className: "btn-admin", type: "submit", text: "Criar implantacao" }));
  form.addEventListener("submit", saveDeployment);
  container.appendChild(form);
}

function field(name, label, type, options = []) {
  const wrap = el("label", { className: type === "textarea" ? "field full" : "field" });
  wrap.appendChild(el("span", { text: label }));
  let input;
  if (type === "textarea") input = el("textarea", { name, rows: "3" });
  else if (type === "select" || type === "relation") {
    input = el("select", { name });
    input.appendChild(el("option", { value: "", text: "Selecionar" }));
    options.forEach((item) => {
      const value = Array.isArray(item) ? item[0] : item.id;
      const text = Array.isArray(item) ? item[1] : item.name;
      input.appendChild(el("option", { value, text }));
    });
  } else input = el("input", { name, type });
  wrap.appendChild(input);
  return wrap;
}

async function saveDeployment(event) {
  event.preventDefault();

  try {
    const payload = getFormData(event.currentTarget);
    const required = ["client_id", "system_id", "plan_id", "instance_name", "environment", "version", "status"];
    const missing = required.find((key) => !payload[key]);
    if (missing) {
      showToast("Preencha todos os campos obrigatorios da implantacao.", "error");
      return;
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") payload[key] = null;
    });
    const { error } = await getSupabase().from("deployments").insert(payload);
    if (error) throw error;
    showToast("Implantacao criada com sucesso.");
    await loadAll();
    render(document.getElementById("deploymentsRoot"));
  } catch (error) {
    console.error(error);
    showToast("Nao foi possivel criar a implantacao.", "error");
  }
}

async function changeStatus(row) {
  const newStatus = prompt("Novo estado: provisioning, active, suspended, maintenance ou cancelled", row.status);
  if (!newStatus || newStatus === row.status) return;
  const reason = prompt("Motivo da alteracao de estado:");
  if (!reason) {
    showToast("O motivo e obrigatorio para alterar o estado.", "error");
    return;
  }

  try {
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const { error: updateError } = await supabase.from("deployments").update({ status: newStatus }).eq("id", row.id);
    if (updateError) throw updateError;
    const { error: historyError } = await supabase.from("deployment_history").insert({
      deployment_id: row.id,
      action: "status_change",
      description: reason,
      previous_status: row.status,
      new_status: newStatus,
      performed_by: sessionData.session?.user.id || null
    });
    if (historyError) throw historyError;
    showToast("Estado atualizado e historico registado.");
    await loadAll();
    render(document.getElementById("deploymentsRoot"));
  } catch (error) {
    console.error(error);
    showToast("Nao foi possivel alterar o estado.", "error");
  }
}

async function showHistory(row) {
  const { data, error } = await getSupabase()
    .from("deployment_history")
    .select("*")
    .eq("deployment_id", row.id)
    .order("created_at", { ascending: false });

  if (error) {
    showToast("Nao foi possivel carregar o historico.", "error");
    return;
  }

  const message = (data || [])
    .map((item) => `${formatDateTime(item.created_at)} - ${t("status", item.previous_status)} -> ${t("status", item.new_status)}: ${item.description}`)
    .join("\n");
  alert(message || "Esta implantacao ainda nao tem historico.");
}
