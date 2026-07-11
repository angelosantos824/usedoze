export const labels = {
  roles: {
    super_admin: "Super administrador",
    admin: "Administrador",
    suporte: "Suporte",
    financeiro: "Financeiro",
    comercial: "Comercial"
  },
  status: {
    active: "Ativo",
    inactive: "Inativo",
    lead: "Lead",
    suspended: "Suspenso",
    cancelled: "Cancelado",
    development: "Em desenvolvimento",
    beta: "Em beta",
    available: "Disponivel",
    maintenance: "Em manutencao",
    discontinued: "Descontinuado",
    provisioning: "Em provisionamento"
  },
  type: {
    individual: "Individual",
    company: "Empresa"
  },
  billing_cycle: {
    monthly: "Mensal",
    quarterly: "Trimestral",
    yearly: "Anual",
    custom: "Personalizado"
  },
  environment: {
    development: "Desenvolvimento",
    staging: "Homologacao",
    production: "Producao"
  },
  priority: {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente"
  }
};

export function t(group, value) {
  return labels[group]?.[value] || value || "A definir";
}

export function formatDate(value) {
  if (!value) return "A definir";
  return new Intl.DateTimeFormat("pt-PT").format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return "A definir";
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatMoney(value, currency = "EUR") {
  if (value === null || value === undefined) return "A definir";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency
  }).format(Number(value));
}

export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);

  Object.entries(options).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else node.setAttribute(key, value);
  });

  children.forEach((child) => {
    node.append(child);
  });

  return node;
}

export function statusPill(value, group = "status") {
  return el("span", {
    className: `status-pill status-${value}`,
    text: t(group, value)
  });
}

export function showToast(message, type = "success") {
  let list = document.querySelector(".toast-list");
  if (!list) {
    list = el("div", { className: "toast-list", "aria-live": "polite" });
    document.body.appendChild(list);
  }

  const toast = el("div", { className: `toast ${type}`, text: message });
  list.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

export function setLoading(container, message = "A carregar dados...") {
  container.textContent = "";
  container.appendChild(el("div", { className: "admin-empty", text: message }));
}

export function setEmpty(container, message = "Sem registos para apresentar.") {
  container.textContent = "";
  container.appendChild(el("div", { className: "admin-empty", text: message }));
}

export function renderTable(container, columns, rows, emptyMessage) {
  container.textContent = "";

  if (!rows.length) {
    setEmpty(container, emptyMessage);
    return;
  }

  const table = el("table", { className: "admin-table" });
  const thead = el("thead");
  const headerRow = el("tr");

  columns.forEach((column) => {
    headerRow.appendChild(el("th", { text: column.label }));
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = el("tbody");
  rows.forEach((row) => {
    const tr = el("tr");
    columns.forEach((column) => {
      const td = el("td");
      const value = column.render ? column.render(row) : row[column.key];
      if (value instanceof Node) td.appendChild(value);
      else td.textContent = value ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(el("div", { className: "admin-table-wrap" }, [table]));
}

export function getFormData(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    data[key] = typeof value === "string" ? value.trim() : value;
  });
  return data;
}
