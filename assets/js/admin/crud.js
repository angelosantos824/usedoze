import { getSupabase } from "./supabase-admin.js";
import { can } from "./permissions.js";
import { el, formatDate, formatMoney, getFormData, renderTable, setLoading, showToast, statusPill, t } from "./ui.js";

const pageConfig = {
  clientes: {
    table: "clients",
    title: "Clientes",
    permission: "clients",
    order: "created_at",
    fields: [
      ["type", "Tipo", "select", [["individual", "Individual"], ["company", "Empresa"]]],
      ["name", "Nome", "text"],
      ["legal_name", "Nome legal", "text"],
      ["document", "Documento", "text"],
      ["email", "Email", "email"],
      ["phone", "Telefone", "text"],
      ["whatsapp", "WhatsApp", "text"],
      ["country", "Pais", "text"],
      ["city", "Cidade", "text"],
      ["address", "Morada", "text"],
      ["contact_name", "Contacto principal", "text"],
      ["status", "Estado", "select", [["lead", "Lead"], ["active", "Ativo"], ["suspended", "Suspenso"], ["cancelled", "Cancelado"]]],
      ["notes", "Notas", "textarea"]
    ],
    columns: [
      { label: "Nome", key: "name" },
      { label: "Email", key: "email" },
      { label: "Telefone", key: "phone" },
      { label: "Tipo", render: (row) => t("type", row.type) },
      { label: "Estado", render: (row) => statusPill(row.status) },
      { label: "Criado", render: (row) => formatDate(row.created_at) }
    ],
    filters: ["search", "status"]
  },
  sistemas: {
    table: "systems",
    title: "Sistemas",
    permission: "systems",
    order: "name",
    editableOnly: ["description", "current_version", "status", "public_url"],
    fields: [
      ["code", "Codigo", "text", null, true],
      ["name", "Nome", "text", null, true],
      ["slug", "Slug", "text", null, true],
      ["description", "Descricao", "textarea"],
      ["current_version", "Versao atual", "text"],
      ["status", "Estado", "select", [["development", "Em desenvolvimento"], ["beta", "Em beta"], ["available", "Disponivel"], ["maintenance", "Em manutencao"], ["discontinued", "Descontinuado"]]],
      ["public_url", "URL publica", "url"]
    ],
    columns: [
      { label: "Sistema", key: "name" },
      { label: "Versao", key: "current_version" },
      { label: "Estado", render: (row) => statusPill(row.status) },
      { label: "URL publica", render: (row) => row.public_url || "A definir" },
      { label: "Atualizado", render: (row) => formatDate(row.updated_at) }
    ],
    filters: ["status"]
  },
  planos: {
    table: "plans",
    title: "Planos",
    permission: "plans",
    order: "created_at",
    relationSelects: ["systems"],
    fields: [
      ["system_id", "Sistema", "relation", "systems"],
      ["name", "Nome", "text"],
      ["description", "Descricao", "textarea"],
      ["price", "Preco", "number"],
      ["currency", "Moeda", "text"],
      ["billing_cycle", "Ciclo", "select", [["monthly", "Mensal"], ["quarterly", "Trimestral"], ["yearly", "Anual"], ["custom", "Personalizado"]]],
      ["user_limit", "Limite de utilizadores", "number"],
      ["unit_limit", "Limite de unidades", "number"],
      ["storage_limit", "Limite de armazenamento", "text"],
      ["status", "Estado", "select", [["active", "Ativo"], ["inactive", "Inativo"]]]
    ],
    select: "*, systems(name)",
    columns: [
      { label: "Plano", key: "name" },
      { label: "Sistema", render: (row) => row.systems?.name || "A definir" },
      { label: "Preco", render: (row) => row.price ? formatMoney(row.price, row.currency || "EUR") : "A definir" },
      { label: "Ciclo", render: (row) => t("billing_cycle", row.billing_cycle) },
      { label: "Estado", render: (row) => statusPill(row.status) }
    ],
    filters: ["status"]
  }
};

let state = { rows: [], editing: null, relations: {}, profile: null };

export async function initCrudPage(page, context) {
  const config = pageConfig[page];
  const root = document.getElementById("crudRoot");
  if (!config || !root) return;
  state = { rows: [], editing: null, relations: {}, profile: context.profile };
  setLoading(root);

  await loadRelations(config);
  await loadRows(config);
  renderPage(root, config);
}

async function loadRelations(config) {
  const supabase = getSupabase();
  for (const relation of config.relationSelects || []) {
    const { data, error } = await supabase.from(relation).select("id, name").order("name");
    if (error) throw error;
    state.relations[relation] = data || [];
  }
}

async function loadRows(config) {
  const supabase = getSupabase();
  const select = config.select || "*";
  const { data, error } = await supabase.from(config.table).select(select).order(config.order, { ascending: config.order === "name" });
  if (error) throw error;
  state.rows = data || [];
}

function renderPage(root, config) {
  root.textContent = "";
  const mayCreate = can(state.profile, `${config.permission}.create`);
  const mayUpdate = can(state.profile, `${config.permission}.update`);
  const tableSlot = el("div");
  const formSlot = el("div");

  root.append(
    el("section", { className: "toolbar" }, [
      buildFilters(config, tableSlot),
      mayCreate || mayUpdate
        ? el("button", { className: "btn-admin", type: "button", text: "Novo registo" })
        : el("span", { className: "admin-muted", text: "Acesso de leitura" })
    ]),
    formSlot,
    tableSlot
  );

  const newButton = root.querySelector(".btn-admin");
  if (newButton && (mayCreate || mayUpdate)) {
    newButton.addEventListener("click", () => {
      state.editing = null;
      renderForm(formSlot, config);
    });
  }

  renderFilteredTable(config, tableSlot);
}

function buildFilters(config, tableSlot) {
  const filters = el("div", { className: "filters" });
  if (config.filters?.includes("search")) {
    const input = el("input", { type: "search", placeholder: "Pesquisar por nome, email ou telefone", id: "searchFilter" });
    input.addEventListener("input", () => renderFilteredTable(config, tableSlot));
    filters.appendChild(input);
  }
  if (config.filters?.includes("status")) {
    const select = el("select", { id: "statusFilter" });
    select.appendChild(el("option", { value: "", text: "Todos os estados" }));
    [...new Set(state.rows.map((row) => row.status).filter(Boolean))].forEach((status) => {
      select.appendChild(el("option", { value: status, text: t("status", status) }));
    });
    select.addEventListener("change", () => renderFilteredTable(config, tableSlot));
    filters.appendChild(select);
  }
  return filters;
}

function filteredRows() {
  const search = document.getElementById("searchFilter")?.value.toLowerCase() || "";
  const status = document.getElementById("statusFilter")?.value || "";
  return state.rows.filter((row) => {
    const matchesSearch = !search || [row.name, row.email, row.phone, row.whatsapp].some((value) => String(value || "").toLowerCase().includes(search));
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesStatus;
  });
}

function renderFilteredTable(config, tableSlot) {
  const columns = [...config.columns];
  if (can(state.profile, `${config.permission}.update`)) {
    columns.push({
      label: "Acoes",
      render: (row) => {
        const button = el("button", { className: "btn-admin secondary", type: "button", text: "Editar" });
        button.addEventListener("click", () => {
          state.editing = row;
          renderForm(document.querySelector("#crudRoot > div"), config);
        });
        return button;
      }
    });
  }
  renderTable(tableSlot, columns, filteredRows(), "Sem registos encontrados.");
}

function renderForm(container, config) {
  container.textContent = "";
  const form = el("form", { className: "admin-form" });
  const grid = el("div", { className: "form-grid" });

  config.fields.forEach(([name, label, type, options, locked]) => {
    const disabled = locked || (state.editing && config.editableOnly && !config.editableOnly.includes(name));
    grid.appendChild(buildField({ name, label, type, options, disabled, value: state.editing?.[name] }));
  });

  form.append(
    grid,
    el("div", { className: "page-actions" }, [
      el("button", { className: "btn-admin", type: "submit", text: "Guardar" }),
      el("button", { className: "btn-admin secondary", type: "button", text: "Cancelar", id: "cancelForm" })
    ])
  );

  form.addEventListener("submit", (event) => saveRecord(event, config));
  container.appendChild(form);
  form.querySelector("#cancelForm").addEventListener("click", () => {
    state.editing = null;
    container.textContent = "";
  });
}

function buildField({ name, label, type, options, disabled, value }) {
  const wrap = el("label", { className: type === "textarea" ? "field full" : "field" });
  wrap.appendChild(el("span", { text: label }));

  let input;
  if (type === "textarea") {
    input = el("textarea", { name, rows: "3" });
  } else if (type === "select") {
    input = el("select", { name });
    (options || []).forEach(([optionValue, optionLabel]) => {
      input.appendChild(el("option", { value: optionValue, text: optionLabel }));
    });
  } else if (type === "relation") {
    input = el("select", { name });
    input.appendChild(el("option", { value: "", text: "Selecionar" }));
    (state.relations[options] || []).forEach((item) => {
      input.appendChild(el("option", { value: item.id, text: item.name }));
    });
  } else {
    input = el("input", { name, type });
  }

  if (disabled) input.disabled = true;
  input.value = value ?? "";
  wrap.appendChild(input);
  return wrap;
}

async function saveRecord(event, config) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = getFormData(form);
  Object.keys(payload).forEach((key) => {
    if (payload[key] === "") payload[key] = null;
    if (["price", "user_limit", "unit_limit"].includes(key) && payload[key] !== null) payload[key] = Number(payload[key]);
  });

  if (state.editing && config.editableOnly) {
    Object.keys(payload).forEach((key) => {
      if (!config.editableOnly.includes(key)) delete payload[key];
    });
  }

  try {
    const supabase = getSupabase();
    const query = state.editing
      ? supabase.from(config.table).update(payload).eq("id", state.editing.id)
      : supabase.from(config.table).insert(payload);
    const { error } = await query;
    if (error) throw error;
    showToast("Registo guardado com sucesso.");
    state.editing = null;
    await loadRows(config);
    const root = document.getElementById("crudRoot");
    renderPage(root, config);
  } catch (error) {
    console.error(error);
    showToast("Nao foi possivel guardar o registo.", "error");
  }
}
