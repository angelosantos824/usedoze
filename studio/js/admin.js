import { carregarComentariosAdmin } from "./comments.js";
import { mostrarToast } from "./notifications.js";
import { carregarAdminUploads } from "./uploads.js";
import { carregarAdminVouchers } from "./vouchers.js";

const CLIENT_DETAIL_LIMIT = 5;

function getDisplayValue(value, fallback = "Nao informado") {
  return value === null || value === undefined || value === ""
    ? fallback
    : String(value);
}

function setTextById(id, value, fallback) {
  const element =
    document.getElementById(id);

  if (!element) return;

  element.textContent =
    getDisplayValue(value, fallback);
}

function formatDate(value) {
  if (!value) return "";

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("pt-PT");
}

function isSchemaColumnError(error) {
  const message =
    `${error?.message || ""} ${error?.details || ""}`;

  return /column|schema cache|Could not find|relation/i.test(message);
}

function renderDetailList(elementId, items, emptyText, renderItem) {
  const container =
    document.getElementById(elementId);

  if (!container) return;

  container.innerHTML = "";

  if (!items || items.length === 0) {
    const empty =
      document.createElement("p");
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }

  items.slice(0, CLIENT_DETAIL_LIMIT).forEach((item) => {
    const row =
      document.createElement("div");
    row.classList.add("client-detail-item");
    row.textContent = renderItem(item);
    container.appendChild(row);
  });
}

async function fetchClientRelatedRows({
  table,
  clientId,
  email,
  orderBy = "created_at"
}) {
  const byClient =
    await supabaseClient
      .from(table)
      .select("*")
      .eq("client_id", clientId)
      .order(orderBy, {
        ascending: false
      })
      .limit(CLIENT_DETAIL_LIMIT);

  if (!byClient.error) {
    return byClient.data || [];
  }

  if (!email) {
    console.warn(
      `Nao foi possivel carregar ${table} por client_id.`,
      byClient.error
    );
    return [];
  }

  const byEmail =
    await supabaseClient
      .from(table)
      .select("*")
      .eq("email", email)
      .order(orderBy, {
        ascending: false
      })
      .limit(CLIENT_DETAIL_LIMIT);

  if (byEmail.error) {
    console.warn(
      `Nao foi possivel carregar ${table} por email.`,
      byEmail.error
    );
    return [];
  }

  return byEmail.data || [];
}

async function registrarAuditoriaAdmin({
  clientId,
  entityType,
  entityId,
  action,
  newData
}) {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  const { error } =
    await supabaseClient
      .from("audit_logs")
      .insert([{
        client_id: clientId,
        entity_type: entityType,
        entity_id: entityId,
        action,
        new_data: newData,
        metadata: {
          actor_user_id: session?.user?.id || null,
          source: "studio_admin"
        }
      }]);

  if (error) {
    console.warn("Nao foi possivel registrar auditoria.", error);
  }
}

async function carregarClientesSelectProjeto() {
  const select =
    document.getElementById("newProjectClient");

  if (!select) return;

  const { data, error } =
    await supabaseClient
      .from("clients")
      .select("id,name,contact_name,email")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    mostrarToast("Erro ao carregar clientes.", "error");
    return;
  }

  select.innerHTML = `
    <option value="">Selecionar cliente</option>
  `;

  (data || []).forEach((cliente) => {
    const option =
      document.createElement("option");
    option.value =
      cliente.id;
    option.textContent =
      `${cliente.contact_name || cliente.name || "Cliente"} - ${
        cliente.email || "sem email"
      }`;
    option.dataset.email =
      cliente.email || "";
    option.dataset.name =
      cliente.name || "";
    option.dataset.contact =
      cliente.contact_name || "";
    select.appendChild(option);
  });
}

async function criarProjetoAdmin(payload) {
  const projectPayload = {
    client_id: payload.clientId,
    name: payload.name,
    service_type: payload.serviceType,
    status: payload.status,
    due_date: payload.dueDate || null,
    progress: payload.progress
  };

  const projectResult =
    await supabaseClient
      .from("projects")
      .insert([projectPayload])
      .select("id")
      .single();

  if (!projectResult.error) {
    await registrarAuditoriaAdmin({
      clientId: payload.clientId,
      entityType: "project",
      entityId: projectResult.data?.id || null,
      action: "project.created",
      newData: projectPayload
    });

    return {
      source: "projects",
      id: projectResult.data?.id
    };
  }

  if (!isSchemaColumnError(projectResult.error)) {
    throw projectResult.error;
  }

  const briefingPayload = {
    client_id: payload.clientId,
    nome: payload.contactName || payload.name,
    email: payload.email,
    empresa: payload.companyName,
    tipo_projeto: payload.serviceType,
    prazo: payload.dueDate || "",
    status: payload.status,
    descricao: payload.name
  };

  const briefingResult =
    await supabaseClient
      .from("briefings")
      .insert([briefingPayload])
      .select("id")
      .single();

  if (briefingResult.error) {
    throw briefingResult.error;
  }

  await registrarAuditoriaAdmin({
    clientId: payload.clientId,
    entityType: "briefing",
    entityId: briefingResult.data?.id || null,
    action: "project.created_from_briefing",
    newData: briefingPayload
  });

  return {
    source: "briefings",
    id: briefingResult.data?.id
  };
}

export async function carregarAdminReal() {
  const tableBody =
    document.querySelector("tbody");
  const panelTitle =
    document.querySelector(".panel-header h2");

  if (!tableBody) return;

  if (panelTitle) {
    panelTitle.textContent =
      "Briefings Recebidos";
  }

  const { data, error } =
    await supabaseClient
      .from("briefings")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          Erro ao carregar dados.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = "";

  if (!data || data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          Nenhum briefing encontrado.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach((briefing) => {
    const tr = document.createElement("tr");

    const tdNome = document.createElement("td");
    tdNome.textContent = briefing.nome || "Sem nome";

    const tdEmpresa = document.createElement("td");
    tdEmpresa.textContent = briefing.empresa || "Não informado";

    const tdProjeto = document.createElement("td");
    tdProjeto.textContent = briefing.tipo_projeto || "Projeto";

    const tdStatus = document.createElement("td");
    const statusSpan = document.createElement("span");
    statusSpan.classList.add("status", "recebido");
    statusSpan.textContent = briefing.status || "Recebido";
    tdStatus.appendChild(statusSpan);

    const tdAcoes = document.createElement("td");
    tdAcoes.classList.add("acoes");

    const verBtn = document.createElement("button");
    verBtn.classList.add("verBtn");
    verBtn.dataset.id = briefing.id;
    verBtn.textContent = "Ver";

    const editarBtn = document.createElement("button");
    editarBtn.classList.add("editarBtn");
    editarBtn.dataset.id = briefing.id;
    editarBtn.textContent = "Editar";

    const excluirBtn = document.createElement("button");
    excluirBtn.classList.add("excluirBtn");
    excluirBtn.dataset.id = briefing.id;
    excluirBtn.textContent = "Excluir";

    tdAcoes.appendChild(verBtn);
    tdAcoes.appendChild(editarBtn);
    tdAcoes.appendChild(excluirBtn);

    tr.appendChild(tdNome);
    tr.appendChild(tdEmpresa);
    tr.appendChild(tdProjeto);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAcoes);

    tableBody.appendChild(tr);
  });

  ativarAcoesAdmin();
}

export function ativarAcoesAdmin() {
  document
    .querySelectorAll(".verBtn")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;

        const { data } = await supabaseClient
          .from("briefings")
          .select("*")
          .eq("id", id)
          .single();

        if (!data) return;

        const modal =
          document.getElementById("adminBriefingModal");

        if (!modal) return;

        document.getElementById("adminModalNome").textContent =
          data.nome || "Detalhes do Briefing";
        document.getElementById("adminModalEmpresa").textContent =
          data.empresa || "Não informado";
        document.getElementById("adminModalEmail").textContent =
          data.email || "Não informado";
        document.getElementById("adminModalTelefone").textContent =
          data.telefone || "Não informado";
        document.getElementById("adminModalProjeto").textContent =
          data.tipo_projeto || "Projeto";
        document.getElementById("adminModalPaginas").textContent =
          data.paginas || "Não informado";
        document.getElementById("adminModalPrazo").textContent =
          data.prazo || "Não informado";
        document.getElementById("adminModalStatus").textContent =
          data.status || "Recebido";
        document.getElementById("adminModalDescricao").textContent =
          data.descricao || "Sem descrição.";

        modal.classList.add("active");
        carregarComentariosAdmin(data.id);
      });
    });

  document
    .querySelectorAll(".excluirBtn")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const confirmar = confirm(
          "Tem certeza que deseja excluir este briefing?"
        );

        if (!confirmar) return;

        const { error } = await supabaseClient
          .from("briefings")
          .delete()
          .eq("id", id);

        if (error) {
          console.error(error);
          alert("Erro ao excluir briefing.");
          return;
        }

        carregarAdminReal();
        carregarCardsAdmin();
      });
    });

  document
    .querySelectorAll(".editarBtn")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;

        const { data } = await supabaseClient
          .from("briefings")
          .select("id,status")
          .eq("id", id)
          .single();

        if (!data) return;

        document.getElementById("editBriefingId").value =
          data.id;
        document.getElementById("editStatusSelect").value =
          data.status || "Recebido";

        document
          .getElementById("adminEditModal")
          .classList.add("active");
      });
    });
}

export function mostrarSecaoEmBreve(secao) {
  const tableBody =
    document.querySelector("tbody");
  const panelTitle =
    document.querySelector(".panel-header h2");

  if (panelTitle) {
    panelTitle.textContent =
      secao.charAt(0).toUpperCase() + secao.slice(1);
  }

  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          Módulo "${secao}" em desenvolvimento.
        </td>
      </tr>
    `;
  }
}

export async function carregarCardsAdmin() {
  if (
    !window.location.pathname.includes("admin.html")
  ) {
    return;
  }

  const { data: briefings } =
    await supabaseClient
      .from("briefings")
      .select("*");

  const { data: vouchers } =
    await supabaseClient
      .from("vouchers")
      .select("*");

  const { count: clientsCount } =
    await supabaseClient
      .from("clients")
      .select("id", {
        count: "exact",
        head: true
      });

  const totalBriefingsAdmin =
    document.getElementById("totalBriefingsAdmin");
  const briefingsPendentes =
    document.getElementById("briefingsPendentes");
  const totalVouchersAdmin =
    document.getElementById("totalVouchersAdmin");
  const vouchersAtivos =
    document.getElementById("vouchersAtivos");
  const totalClientes =
    document.getElementById("totalClientes");
  const totalProjetos =
    document.getElementById("totalProjetos");
  const projetosAndamento =
    document.getElementById("projetosAndamento");

  if (totalBriefingsAdmin) {
    totalBriefingsAdmin.textContent =
      briefings?.length || 0;
  }

  if (briefingsPendentes) {
    briefingsPendentes.textContent =
      briefings?.filter(
        (item) =>
          item.status === "Novo" ||
          item.status === "Recebido" ||
          !item.status
      ).length || 0;
  }

  if (totalVouchersAdmin) {
    totalVouchersAdmin.textContent =
      vouchers?.length || 0;
  }

  if (vouchersAtivos) {
    vouchersAtivos.textContent =
      vouchers?.filter((item) => item.ativo).length || 0;
  }

  if (totalClientes) {
    totalClientes.textContent =
      clientsCount || 0;
  }

  if (totalProjetos) {
    totalProjetos.textContent =
      briefings?.filter(
        (item) =>
          item.status === "Em andamento" ||
          item.status === "Em desenvolvimento"
      ).length || 0;
  }

  if (projetosAndamento) {
    projetosAndamento.textContent =
      briefings?.filter(
        (item) =>
          item.status === "Em andamento" ||
          item.status === "Em desenvolvimento"
      ).length || 0;
  }
}

export function aplicarFiltrosAdmin() {
  const adminSearch =
    document.getElementById("adminSearch");
  const adminStatusFilter =
    document.getElementById("adminStatusFilter");
  const linhas =
    document.querySelectorAll("tbody tr");
  const termo =
    adminSearch?.value.toLowerCase() || "";
  const statusFiltro =
    adminStatusFilter?.value || "";

  linhas.forEach((linha) => {
    const texto =
      linha.textContent.toLowerCase();
    const status =
      linha.querySelector(".status")
        ?.textContent.trim() || "";
    const correspondeBusca =
      texto.includes(termo);
    const correspondeStatus =
      !statusFiltro || status === statusFiltro;

    linha.style.display =
      correspondeBusca && correspondeStatus
        ? ""
        : "none";
  });
}

export async function carregarAdminClientes() {
  const tableBody =
    document.querySelector("tbody");
  const panelTitle =
    document.querySelector(".panel-header h2");

  if (!tableBody) return;

  if (panelTitle) {
    panelTitle.textContent = "Clientes";
  }

  const { data, error } =
    await supabaseClient
      .from("clients")
      .select("id,name,contact_name,email,status,type,origin,created_at")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    return;
  }

  const clientes = data || [];

  tableBody.innerHTML = "";

  if (clientes.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          Nenhum cliente encontrado.
        </td>
      </tr>
    `;
    return;
  }

  clientes.forEach((cliente) => {
    const tr =
      document.createElement("tr");

    const tdNome =
      document.createElement("td");
    tdNome.textContent =
      cliente.contact_name || cliente.name || "Sem nome";

    const tdEmpresa =
      document.createElement("td");
    tdEmpresa.textContent =
      cliente.name || "Nao informado";

    const tdEmail =
      document.createElement("td");
    tdEmail.textContent =
      cliente.email || "Nao informado";

    const tdStatus =
      document.createElement("td");
    const status =
      document.createElement("span");
    status.classList.add("status", "recebido");
    status.textContent =
      cliente.status || "Cliente";
    tdStatus.appendChild(status);

    const tdAcoes =
      document.createElement("td");
    tdAcoes.classList.add("acoes");

    const verBtn =
      document.createElement("button");
    verBtn.classList.add("verClienteBtn");
    verBtn.dataset.id =
      cliente.id;
    verBtn.textContent =
      "Ver";
    verBtn.type = "button";
    verBtn.title = "Ver detalhes do cliente.";
    tdAcoes.appendChild(verBtn);

    tr.append(
      tdNome,
      tdEmpresa,
      tdEmail,
      tdStatus,
      tdAcoes
    );

    tableBody.appendChild(tr);
  });

  ativarAcoesClientesAdmin();
}

export function ativarAcoesClientesAdmin() {
  document
    .querySelectorAll(".verClienteBtn")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id =
          btn.dataset.id;

        if (!id) return;

        btn.disabled = true;

        try {
          await abrirDetalhesClienteAdmin(id);
        } finally {
          btn.disabled = false;
        }
      });
    });
}

export async function abrirDetalhesClienteAdmin(clientId) {
  const modal =
    document.getElementById("adminClientModal");

  if (!modal) {
    mostrarToast("Modal de cliente indisponivel.", "error");
    return;
  }

  const { data: cliente, error } =
    await supabaseClient
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

  if (error || !cliente) {
    console.error(error);
    mostrarToast("Erro ao carregar cliente.", "error");
    return;
  }

  const email =
    cliente.email || "";

  const [
    profilesResult,
    briefings,
    uploads,
    vouchers
  ] = await Promise.all([
    supabaseClient
      .from("profiles")
      .select("id,nome,email,client_id,created_at")
      .eq("client_id", clientId)
      .limit(1),
    fetchClientRelatedRows({
      table: "briefings",
      clientId,
      email
    }),
    fetchClientRelatedRows({
      table: "project_uploads",
      clientId,
      email,
      orderBy: "criado_em"
    }),
    fetchClientRelatedRows({
      table: "vouchers",
      clientId,
      email,
      orderBy: "criado_em"
    })
  ]);

  if (profilesResult.error) {
    console.warn(
      "Nao foi possivel carregar profile do cliente.",
      profilesResult.error
    );
  }

  const profile =
    profilesResult.data?.[0];

  setTextById(
    "adminClientModalTitle",
    cliente.contact_name || cliente.name,
    "Detalhes do Cliente"
  );
  setTextById("adminClientContact", cliente.contact_name || cliente.name);
  setTextById("adminClientCompany", cliente.name);
  setTextById("adminClientEmail", cliente.email);
  setTextById("adminClientStatus", cliente.status || "Cliente");
  setTextById("adminClientType", cliente.type);
  setTextById("adminClientOrigin", cliente.origin);
  setTextById(
    "adminClientProfile",
    profile
      ? `${profile.nome || profile.email || profile.id} - profile vinculado`
      : "Nenhum profile vinculado encontrado."
  );

  renderDetailList(
    "adminClientBriefings",
    briefings,
    "Nenhum briefing encontrado para este cliente.",
    (briefing) =>
      `${briefing.nome || briefing.tipo_projeto || "Briefing"} - ${
        briefing.status || "Recebido"
      } ${formatDate(briefing.created_at)}`
  );

  renderDetailList(
    "adminClientProjects",
    briefings,
    "Nenhum projeto encontrado para este cliente.",
    (projeto) =>
      `${projeto.tipo_projeto || projeto.nome || "Projeto"} - ${
        projeto.status || "Recebido"
      }`
  );

  renderDetailList(
    "adminClientUploads",
    uploads,
    "Nenhum upload encontrado para este cliente.",
    (upload) =>
      `${upload.nome_arquivo || "Arquivo"} - ${
        upload.tipo || "Arquivo"
      } ${formatDate(upload.criado_em)}`
  );

  renderDetailList(
    "adminClientVouchers",
    vouchers,
    "Nenhum voucher encontrado para este cliente.",
    (voucher) =>
      `${voucher.codigo || "Voucher"} - ${
        voucher.ativo ? "Ativo" : "Inativo"
      }`
  );

  modal.classList.add("active");
}

export async function carregarAdminProjetos() {
  const tableBody =
    document.querySelector("tbody");

  if (!tableBody) return;

  const { data, error } =
    await supabaseClient
      .from("briefings")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    return;
  }

  tableBody.innerHTML = "";

  if (!data || data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          Nenhum projeto encontrado.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach((projeto) => {
    const tr =
      document.createElement("tr");

    const tdNome =
      document.createElement("td");
    tdNome.textContent =
      projeto.nome || "Sem nome";

    const tdEmpresa =
      document.createElement("td");
    tdEmpresa.textContent =
      projeto.empresa || "Não informado";

    const tdProjeto =
      document.createElement("td");
    tdProjeto.textContent =
      projeto.tipo_projeto || "Projeto";

    const tdStatus =
      document.createElement("td");
    const status =
      document.createElement("span");
    status.classList.add("status", "recebido");
    status.textContent =
      projeto.status || "Recebido";
    tdStatus.appendChild(status);

    const tdAcoes =
      document.createElement("td");
    tdAcoes.classList.add("acoes");

    const verBtn =
      document.createElement("button");
    verBtn.classList.add("verBtn");
    verBtn.dataset.id =
      projeto.id;
    verBtn.textContent =
      "Ver";

    const editarBtn =
      document.createElement("button");
    editarBtn.classList.add("editarBtn");
    editarBtn.dataset.id =
      projeto.id;
    editarBtn.textContent =
      "Editar";

    tdAcoes.append(verBtn, editarBtn);

    tr.append(
      tdNome,
      tdEmpresa,
      tdProjeto,
      tdStatus,
      tdAcoes
    );

    tableBody.appendChild(tr);
  });

  ativarAcoesAdmin();
}

function initAdminMenu() {
  const adminMenuLinks =
    document.querySelectorAll(".menu a[data-section]");

  adminMenuLinks.forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();

      adminMenuLinks.forEach((item) => {
        item.classList.remove("active");
      });

      link.classList.add("active");

      const secao =
        link.dataset.section;

      if (secao === "dashboard" || secao === "briefings") {
        carregarAdminReal();
        return;
      }

      if (secao === "clientes") {
        carregarAdminClientes();
        return;
      }

      if (secao === "projetos") {
        carregarAdminProjetos();
        return;
      }

      if (secao === "vouchers") {
        carregarAdminVouchers();
        return;
      }

      if (secao === "uploads") {
        carregarAdminUploads();
        return;
      }

      mostrarSecaoEmBreve(secao);
    });
  });
}

function initAdminModals() {
  const adminBriefingModal =
    document.getElementById("adminBriefingModal");
  const closeAdminBriefingModal =
    document.getElementById("closeAdminBriefingModal");

  if (adminBriefingModal && closeAdminBriefingModal) {
    closeAdminBriefingModal.addEventListener("click", () => {
      adminBriefingModal.classList.remove("active");
    });

    adminBriefingModal.addEventListener("click", (event) => {
      if (event.target === adminBriefingModal) {
        adminBriefingModal.classList.remove("active");
      }
    });
  }

  const adminClientModal =
    document.getElementById("adminClientModal");
  const closeAdminClientModal =
    document.getElementById("closeAdminClientModal");

  if (adminClientModal && closeAdminClientModal) {
    closeAdminClientModal.addEventListener("click", () => {
      adminClientModal.classList.remove("active");
    });

    adminClientModal.addEventListener("click", (event) => {
      if (event.target === adminClientModal) {
        adminClientModal.classList.remove("active");
      }
    });
  }

  const adminNewProjectModal =
    document.getElementById("adminNewProjectModal");
  const closeAdminNewProjectModal =
    document.getElementById("closeAdminNewProjectModal");

  if (adminNewProjectModal && closeAdminNewProjectModal) {
    closeAdminNewProjectModal.addEventListener("click", () => {
      adminNewProjectModal.classList.remove("active");
    });

    adminNewProjectModal.addEventListener("click", (event) => {
      if (event.target === adminNewProjectModal) {
        adminNewProjectModal.classList.remove("active");
      }
    });
  }

  const adminEditModal =
    document.getElementById("adminEditModal");
  const closeAdminEditModal =
    document.getElementById("closeAdminEditModal");
  const salvarEditStatusBtn =
    document.getElementById("salvarEditStatusBtn");

  if (adminEditModal && closeAdminEditModal) {
    closeAdminEditModal.addEventListener("click", () => {
      adminEditModal.classList.remove("active");
    });

    adminEditModal.addEventListener("click", (event) => {
      if (event.target === adminEditModal) {
        adminEditModal.classList.remove("active");
      }
    });
  }

  if (!salvarEditStatusBtn) return;

  salvarEditStatusBtn.addEventListener("click", async () => {
    const id =
      document.getElementById("editBriefingId").value;
    const status =
      document.getElementById("editStatusSelect").value;

    if (!id || !status) return;

    const { error } = await supabaseClient
      .from("briefings")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error(error);
      mostrarToast("Erro ao atualizar status.", "error");
      return;
    }

    adminEditModal.classList.remove("active");
    mostrarToast("Status atualizado com sucesso!", "success");
    carregarAdminReal();
    carregarCardsAdmin();
  });
}

function initAdminFiltros() {
  const adminSearch =
    document.getElementById("adminSearch");
  const adminStatusFilter =
    document.getElementById("adminStatusFilter");

  if (adminSearch) {
    adminSearch.addEventListener(
      "input",
      aplicarFiltrosAdmin
    );
  }

  if (adminStatusFilter) {
    adminStatusFilter.addEventListener(
      "change",
      aplicarFiltrosAdmin
    );
  }
}

function initNovoProjetoAdmin() {
  const novoProjetoBtn =
    document.getElementById("novoProjetoBtn");
  const adminNewProjectModal =
    document.getElementById("adminNewProjectModal");
  const adminNewProjectForm =
    document.getElementById("adminNewProjectForm");

  if (novoProjetoBtn && adminNewProjectModal) {
    novoProjetoBtn.addEventListener("click", async () => {
      await carregarClientesSelectProjeto();
      adminNewProjectModal.classList.add("active");
    });
  }

  if (!adminNewProjectForm) return;

  adminNewProjectForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton =
      adminNewProjectForm.querySelector('button[type="submit"]');
    const clientSelect =
      document.getElementById("newProjectClient");
    const selectedOption =
      clientSelect?.selectedOptions?.[0];
    const clientId =
      clientSelect?.value || "";
    const name =
      document.getElementById("newProjectName")?.value.trim() || "";
    const serviceType =
      document.getElementById("newProjectServiceType")?.value.trim() || "";
    const status =
      document.getElementById("newProjectStatus")?.value || "Recebido";
    const dueDate =
      document.getElementById("newProjectDueDate")?.value || "";
    const progressValue =
      Number(document.getElementById("newProjectProgress")?.value || 0);
    const progress =
      Math.min(Math.max(progressValue, 0), 100);

    if (!clientId || !name || !serviceType) {
      mostrarToast("Preencha cliente, nome e tipo de servico.", "error");
      return;
    }

    if (submitButton?.disabled) return;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Criando...";
    }

    try {
      await criarProjetoAdmin({
        clientId,
        name,
        serviceType,
        status,
        dueDate,
        progress,
        email: selectedOption?.dataset.email || "",
        companyName: selectedOption?.dataset.name || "",
        contactName: selectedOption?.dataset.contact || ""
      });

      adminNewProjectModal?.classList.remove("active");
      adminNewProjectForm.reset();
      mostrarToast("Projeto criado com sucesso.", "success");
      carregarCardsAdmin();
      carregarAdminProjetos();
    } catch (error) {
      console.error(error);
      mostrarToast("Erro ao criar projeto.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Criar Projeto";
      }
    }
  });
}

export function initAdmin() {
  if (window.location.pathname.includes("admin.html")) {
    carregarAdminReal();
  }

  initAdminMenu();
  carregarCardsAdmin();
  initAdminModals();
  initAdminFiltros();
  initNovoProjetoAdmin();
}
