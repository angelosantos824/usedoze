import { carregarComentariosAdmin } from "./comments.js";
import { mostrarToast } from "./notifications.js";
import { carregarAdminUploads } from "./uploads.js";
import { carregarAdminVouchers } from "./vouchers.js";

const CLIENT_DETAIL_LIMIT = 5;

const PROJECT_STATUS_LABELS = {
  draft: "Rascunho",
  in_progress: "Em desenvolvimento",
  internal_review: "Em revisao interna",
  awaiting_client_approval: "Aguardando aprovacao do cliente",
  changes_requested: "Alteracoes solicitadas",
  approved: "Aprovado pelo cliente",
  completed: "Concluido",
  cancelled: "Cancelado"
};

function getProjectStatusLabel(status) {
  return PROJECT_STATUS_LABELS[status] || status || "Rascunho";
}

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

async function localizarClientIdBriefing(briefing) {
  if (briefing?.client_id) {
    return briefing.client_id;
  }

  const email =
    briefing?.email?.trim() || "";
  const matchValues =
    [
      briefing?.empresa,
      briefing?.nome
    ]
      .map((value) => value?.trim())
      .filter(Boolean);

  if (email) {
    const profileResult =
      await supabaseClient
        .from("profiles")
        .select("client_id")
        .eq("email", email)
        .not("client_id", "is", null)
        .limit(1)
        .maybeSingle();

    if (!profileResult.error && profileResult.data?.client_id) {
      return profileResult.data.client_id;
    }

    const clientResult =
      await supabaseClient
        .from("clients")
        .select("id")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

    if (!clientResult.error && clientResult.data?.id) {
      return clientResult.data.id;
    }
  }

  for (const value of matchValues) {
    const clientByCompanyResult =
      await supabaseClient
        .from("clients")
        .select("id")
        .eq("name", value)
        .limit(1)
        .maybeSingle();

    if (!clientByCompanyResult.error && clientByCompanyResult.data?.id) {
      return clientByCompanyResult.data.id;
    }

    const clientByContactResult =
      await supabaseClient
        .from("clients")
        .select("id")
        .eq("contact_name", value)
        .limit(1)
        .maybeSingle();

    if (!clientByContactResult.error && clientByContactResult.data?.id) {
      return clientByContactResult.data.id;
    }

    const profileByNameResult =
      await supabaseClient
        .from("profiles")
        .select("client_id")
        .eq("nome", value)
        .not("client_id", "is", null)
        .limit(1)
        .maybeSingle();

    if (!profileByNameResult.error && profileByNameResult.data?.client_id) {
      return profileByNameResult.data.client_id;
    }
  }

  return "";
}

async function buscarProjetoPorBriefingId(briefingId) {
  if (!briefingId) return null;

  const { data, error } =
    await supabaseClient
      .from("projects")
      .select("id,name")
      .eq("briefing_id", briefingId)
      .maybeSingle();

  if (error) {
    if (isSchemaColumnError(error)) {
      return null;
    }

    throw error;
  }

  return data || null;
}

async function buscarProjetoSimilar({ clientId, name, serviceType }) {
  if (!clientId || !name) return null;

  const { data, error } =
    await supabaseClient
      .from("projects")
      .select("id,name")
      .eq("client_id", clientId)
      .eq("name", name)
      .eq("service_type", serviceType || "Projeto")
      .limit(1)
      .maybeSingle();

  if (error) {
    console.warn("Nao foi possivel verificar projeto similar.", error);
    return null;
  }

  return data || null;
}

async function abrirFormularioProjetoPorBriefing(briefingId) {
  if (!briefingId) return;

  try {
    const projetoExistente =
      await buscarProjetoPorBriefingId(briefingId);

    if (projetoExistente?.id) {
      mostrarToast("Este briefing ja foi convertido em projeto.", "info");
      await abrirProjetoAdmin(projetoExistente.id);
      return;
    }

    const { data: briefing, error } =
      await supabaseClient
        .from("briefings")
        .select("*")
        .eq("id", briefingId)
        .single();

    if (error || !briefing) {
      throw error || new Error("Briefing nao encontrado.");
    }

    const clientId =
      await localizarClientIdBriefing(briefing);

    if (!clientId) {
      mostrarToast(
        "Nao foi possivel localizar o cliente deste briefing.",
        "error"
      );
      return;
    }

    const name =
      briefing.empresa
        ? `Site ${briefing.empresa}`
        : briefing.tipo_projeto || "Novo projeto";
    const serviceType =
      briefing.tipo_projeto || "Website institucional";
    const projetoSimilar =
      await buscarProjetoSimilar({
        clientId,
        name,
        serviceType
      });

    if (projetoSimilar?.id) {
      mostrarToast("Ja existe um projeto similar para este cliente.", "info");
      await abrirProjetoAdmin(projetoSimilar.id);
      return;
    }

    const result =
      await criarProjetoAdmin({
        clientId,
        briefingId: briefing.id,
        name,
        serviceType,
        description: briefing.descricao || "",
        status: "in_progress",
        deadline: "",
        progress: 0,
        previewUrl: "",
        repositoryUrl: ""
      });
    const adminBriefingModal =
      document.getElementById("adminBriefingModal");

    adminBriefingModal?.classList.remove("active");
    mostrarToast("Projeto criado a partir do briefing.", "success");
    carregarCardsAdmin();
    carregarAdminProjetos();

    if (result?.id) {
      await abrirProjetoAdmin(result.id);
    }
  } catch (error) {
    console.error(error);
    if (error?.projectId) {
      mostrarToast("Este briefing ja possui um projeto vinculado.", "info");
      await abrirProjetoAdmin(error.projectId);
      return;
    }

    mostrarToast("Erro ao converter briefing em projeto.", "error");
  }
}

async function criarProjetoAdmin(payload) {
  const projectPayload = {
    client_id: payload.clientId,
    name: payload.name,
    service_type: payload.serviceType,
    description: payload.description,
    status: payload.status,
    deadline: payload.deadline || null,
    progress: payload.progress,
    preview_url: payload.previewUrl || null,
    repository_url: payload.repositoryUrl || null,
    approval_requested_at:
      payload.status === "awaiting_client_approval"
        ? new Date().toISOString()
      : null
  };

  if (payload.briefingId) {
    projectPayload.briefing_id =
      payload.briefingId;
  }

  if (payload.briefingId) {
    const projetoExistente =
      await buscarProjetoPorBriefingId(payload.briefingId);

    if (projetoExistente?.id) {
      const error =
        new Error("Este briefing ja possui um projeto vinculado.");
      error.projectId =
        projetoExistente.id;
      throw error;
    }
  }

  let { data, error } =
    await supabaseClient
      .from("projects")
      .insert([projectPayload])
      .select("id")
      .single();

  if (error && payload.briefingId && isSchemaColumnError(error)) {
    const {
      briefing_id,
      ...fallbackPayload
    } = projectPayload;

    const fallbackResult =
      await supabaseClient
        .from("projects")
        .insert([fallbackPayload])
        .select("id")
        .single();

    data =
      fallbackResult.data;
    error =
      fallbackResult.error;
  }

  if (error) {
    throw error;
  }

  await registrarAuditoriaAdmin({
    clientId: payload.clientId,
    entityType: "project",
    entityId: data?.id || null,
    action: "project.created",
    newData: projectPayload
  });

  return {
    source: "projects",
    id: data?.id
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

    const converterBtn = document.createElement("button");
    converterBtn.classList.add("converterProjetoBtn");
    converterBtn.dataset.id = briefing.id;
    converterBtn.textContent = "Converter em Projeto";

    const excluirBtn = document.createElement("button");
    excluirBtn.classList.add("excluirBtn");
    excluirBtn.dataset.id = briefing.id;
    excluirBtn.textContent = "Excluir";

    tdAcoes.appendChild(verBtn);
    tdAcoes.appendChild(converterBtn);
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

        modal.dataset.briefingId =
          data.id;
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
    .querySelectorAll(".converterProjetoBtn")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        await abrirFormularioProjetoPorBriefing(btn.dataset.id);
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

  const { data: projects } =
    await supabaseClient
      .from("projects")
      .select("status");

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
      projects?.length || 0;
  }

  if (projetosAndamento) {
    projetosAndamento.textContent =
      projects?.filter(
        (item) =>
          item.status === "in_progress" ||
          item.status === "awaiting_client_approval" ||
          item.status === "changes_requested"
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

    const excluirBtn =
      document.createElement("button");
    excluirBtn.classList.add("excluirClienteBtn");
    excluirBtn.dataset.id =
      cliente.id;
    excluirBtn.dataset.name =
      cliente.contact_name || cliente.name || "";
    excluirBtn.dataset.email =
      cliente.email || "";
    excluirBtn.textContent =
      "Excluir";
    excluirBtn.type = "button";
    excluirBtn.title =
      "Excluir cliente de teste. Nao remove auth.users.";

    tdAcoes.append(verBtn, excluirBtn);

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

  document
    .querySelectorAll(".excluirClienteBtn")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id =
          btn.dataset.id;

        if (!id) return;

        const label =
          btn.dataset.name ||
          btn.dataset.email ||
          "cliente";
        const confirmacao =
          prompt(
            `Para excluir o cliente "${label}", digite EXCLUIR. Esta acao nao apaga auth.users.`
          );

        if (confirmacao !== "EXCLUIR") {
          return;
        }

        btn.disabled = true;
        btn.textContent = "Excluindo...";

        try {
          await excluirClienteAdmin(id);
          mostrarToast("Cliente excluido com sucesso.", "success");
          await carregarAdminClientes();
          carregarCardsAdmin();
        } catch (error) {
          console.error(error);
          mostrarToast("Erro ao excluir cliente.", "error");
        } finally {
          btn.disabled = false;
          btn.textContent = "Excluir";
        }
      });
    });
}

async function excluirClienteAdmin(clientId) {
  const { data: cliente, error: loadError } =
    await supabaseClient
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

  if (loadError || !cliente) {
    throw loadError || new Error("Cliente nao encontrado.");
  }

  await registrarAuditoriaAdmin({
    clientId,
    entityType: "client",
    entityId: clientId,
    action: "client.deleted_by_admin",
    newData: {
      id: cliente.id,
      name: cliente.name,
      contact_name: cliente.contact_name,
      email: cliente.email,
      status: cliente.status,
      type: cliente.type
    }
  });

  const { error } =
    await supabaseClient
      .from("clients")
      .delete()
      .eq("id", clientId);

  if (error) {
    throw error;
  }
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
  const panelTitle =
    document.querySelector(".panel-header h2");

  if (!tableBody) return;

  if (panelTitle) {
    panelTitle.textContent = "Projetos";
  }

  const { data, error } =
    await supabaseClient
      .from("projects")
      .select("*,clients(id,name,contact_name,email)")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          Erro ao carregar projetos.
        </td>
      </tr>
    `;
    return;
  }

  const projetos = data || [];
  tableBody.innerHTML = "";

  if (projetos.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          Nenhum projeto encontrado.
        </td>
      </tr>
    `;
    return;
  }

  projetos.forEach((projeto) => {
    const tr =
      document.createElement("tr");

    const tdNome =
      document.createElement("td");
    tdNome.textContent =
      projeto.name || "Sem nome";

    const tdEmpresa =
      document.createElement("td");
    tdEmpresa.textContent =
      projeto.clients?.name ||
      projeto.clients?.contact_name ||
      "Nao informado";

    const tdProjeto =
      document.createElement("td");
    tdProjeto.textContent =
      projeto.service_type || "Projeto";

    const tdStatus =
      document.createElement("td");
    const status =
      document.createElement("span");
    status.classList.add("status", "recebido");
    status.textContent =
      getProjectStatusLabel(projeto.status);
    tdStatus.appendChild(status);

    const tdAcoes =
      document.createElement("td");
    tdAcoes.classList.add("acoes");

    const verBtn =
      document.createElement("button");
    verBtn.classList.add("verProjetoBtn");
    verBtn.dataset.id =
      projeto.id;
    verBtn.textContent =
      "Ver";

    const editarBtn =
      document.createElement("button");
    editarBtn.classList.add("editarProjetoBtn");
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

  ativarAcoesProjetosAdmin();
}

function ativarAcoesProjetosAdmin() {
  document
    .querySelectorAll(".verProjetoBtn, .editarProjetoBtn")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id =
          btn.dataset.id;

        if (!id) return;

        await abrirProjetoAdmin(id);
      });
    });
}

async function carregarHistoricoProjeto(projectId) {
  const container =
    document.getElementById("adminProjectHistory");

  if (!container) return;

  const { data, error } =
    await supabaseClient
      .from("project_comments")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", {
        ascending: true
      });

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Erro ao carregar historico.</p>";
    return;
  }

  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Nenhum historico registrado.</p>";
    return;
  }

  data.forEach((item) => {
    const row =
      document.createElement("div");
    row.classList.add("client-detail-item");
    row.textContent =
      `${item.author_role || "cliente"} - ${item.comment_type || "message"}: ${
        item.message || item.mensagem || ""
      }`;
    container.appendChild(row);
  });
}

async function carregarAtualizacoesProjetoAdmin(projectId) {
  const container =
    document.getElementById("adminProjectUpdatesHistory");

  if (!container) return;

  const { data, error } =
    await supabaseClient
      .from("project_updates")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Erro ao carregar atualizacoes.</p>";
    return;
  }

  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Nenhuma atualizacao publicada.</p>";
    return;
  }

  data.forEach((item) => {
    const row =
      document.createElement("div");
    row.classList.add("client-detail-item");
    row.textContent =
      `${item.title || "Atualizacao"} - ${
        getProjectStatusLabel(item.status)
      } - ${item.progress ?? 0}% - ${formatDate(item.created_at)}`;
    container.appendChild(row);
  });
}

async function abrirProjetoAdmin(projectId) {
  const modal =
    document.getElementById("adminProjectModal");

  if (!modal) return;

  const { data, error } =
    await supabaseClient
      .from("projects")
      .select("*,clients(id,name,contact_name,email)")
      .eq("id", projectId)
      .single();

  if (error || !data) {
    console.error(error);
    mostrarToast("Erro ao carregar projeto.", "error");
    return;
  }

  document.getElementById("editProjectId").value =
    data.id;
  document.getElementById("adminProjectModalTitle").textContent =
    data.name || "Editar Projeto";
  document.getElementById("editProjectName").value =
    data.name || "";
  document.getElementById("editProjectServiceType").value =
    data.service_type || "";
  document.getElementById("editProjectDescription").value =
    data.description || "";
  document.getElementById("editProjectStatus").value =
    data.status || "draft";
  document.getElementById("editProjectDeadline").value =
    data.deadline || "";
  document.getElementById("editProjectProgress").value =
    data.progress ?? 0;
  document.getElementById("editProjectPreviewUrl").value =
    data.preview_url || "";
  document.getElementById("editProjectRepositoryUrl").value =
    data.repository_url || "";
  document.getElementById("adminProjectResponse").value =
    "";
  document.getElementById("projectUpdateTitle").value =
    "";
  document.getElementById("projectUpdateReady").value =
    "";
  document.getElementById("projectUpdateProgressText").value =
    "";
  document.getElementById("projectUpdateNextSteps").value =
    "";
  document.getElementById("projectUpdateDeadlineText").value =
    "";

  await carregarHistoricoProjeto(data.id);
  await carregarAtualizacoesProjetoAdmin(data.id);
  modal.dataset.clientId =
    data.client_id;
  modal.classList.add("active");
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

  const convertBriefingProjectBtn =
    document.getElementById("convertBriefingProjectBtn");

  if (convertBriefingProjectBtn && adminBriefingModal) {
    convertBriefingProjectBtn.addEventListener("click", async () => {
      await abrirFormularioProjetoPorBriefing(
        adminBriefingModal.dataset.briefingId
      );
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

  const adminProjectModal =
    document.getElementById("adminProjectModal");
  const closeAdminProjectModal =
    document.getElementById("closeAdminProjectModal");

  if (adminProjectModal && closeAdminProjectModal) {
    closeAdminProjectModal.addEventListener("click", () => {
      adminProjectModal.classList.remove("active");
    });

    adminProjectModal.addEventListener("click", (event) => {
      if (event.target === adminProjectModal) {
        adminProjectModal.classList.remove("active");
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
      adminNewProjectForm?.reset();
      document.getElementById("newProjectBriefingId").value =
        "";
      const title =
        adminNewProjectModal.querySelector("h2");
      if (title) {
        title.textContent = "Novo Projeto";
      }
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
    const description =
      document.getElementById("newProjectDescription")?.value.trim() || "";
    const status =
      document.getElementById("newProjectStatus")?.value || "draft";
    const deadline =
      document.getElementById("newProjectDeadline")?.value || "";
    const progressValue =
      Number(document.getElementById("newProjectProgress")?.value || 0);
    const progress =
      Math.min(Math.max(progressValue, 0), 100);
    const previewUrl =
      document.getElementById("newProjectPreviewUrl")?.value.trim() || "";
    const repositoryUrl =
      document.getElementById("newProjectRepositoryUrl")?.value.trim() || "";
    const briefingId =
      document.getElementById("newProjectBriefingId")?.value || "";

    if (!clientId || !name || !serviceType) {
      mostrarToast("Preencha cliente, nome e tipo de servico.", "error");
      return;
    }

    if (status === "awaiting_client_approval" && !previewUrl) {
      mostrarToast("Informe a URL de visualizacao para solicitar aprovacao.", "error");
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
        description,
        status,
        deadline,
        progress,
        previewUrl,
        repositoryUrl,
        briefingId,
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
      if (error?.projectId) {
        mostrarToast("Este briefing ja possui um projeto vinculado.", "info");
        await abrirProjetoAdmin(error.projectId);
      } else {
        mostrarToast("Erro ao criar projeto.", "error");
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Criar Projeto";
      }
    }
  });
}

function initEditarProjetoAdmin() {
  const adminProjectForm =
    document.getElementById("adminProjectForm");

  if (!adminProjectForm) return;

  adminProjectForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton =
      adminProjectForm.querySelector('button[type="submit"]');
    const projectId =
      document.getElementById("editProjectId")?.value || "";
    const modal =
      document.getElementById("adminProjectModal");
    const clientId =
      modal?.dataset.clientId || "";
    const responseMessage =
      document.getElementById("adminProjectResponse")?.value.trim() || "";
    const updateTitle =
      document.getElementById("projectUpdateTitle")?.value.trim() || "";
    const updateReady =
      document.getElementById("projectUpdateReady")?.value.trim() || "";
    const updateProgressText =
      document.getElementById("projectUpdateProgressText")?.value.trim() || "";
    const updateNextSteps =
      document.getElementById("projectUpdateNextSteps")?.value.trim() || "";
    const updateDeadlineText =
      document.getElementById("projectUpdateDeadlineText")?.value.trim() || "";
    const status =
      document.getElementById("editProjectStatus")?.value || "draft";
    const payload = {
      name:
        document.getElementById("editProjectName")?.value.trim() || "",
      service_type:
        document.getElementById("editProjectServiceType")?.value.trim() || "",
      description:
        document.getElementById("editProjectDescription")?.value.trim() || "",
      status,
      deadline:
        document.getElementById("editProjectDeadline")?.value || null,
      progress:
        Math.min(
          Math.max(Number(document.getElementById("editProjectProgress")?.value || 0), 0),
          100
        ),
      preview_url:
        document.getElementById("editProjectPreviewUrl")?.value.trim() || null,
      repository_url:
        document.getElementById("editProjectRepositoryUrl")?.value.trim() || null,
      approval_requested_at:
        status === "awaiting_client_approval"
          ? new Date().toISOString()
          : null
    };

    if (!projectId || !clientId || !payload.name || !payload.service_type) {
      mostrarToast("Preencha os dados obrigatorios do projeto.", "error");
      return;
    }

    if (payload.status === "awaiting_client_approval" && !payload.preview_url) {
      mostrarToast("Informe a URL de visualizacao para solicitar aprovacao.", "error");
      return;
    }

    const hasProjectUpdate =
      Boolean(
        updateTitle ||
        updateReady ||
        updateProgressText ||
        updateNextSteps ||
        updateDeadlineText
      );

    if (hasProjectUpdate && !updateTitle) {
      mostrarToast("Informe o titulo da atualizacao.", "error");
      return;
    }

    if (submitButton?.disabled) return;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Salvando...";
    }

    try {
      const { error } =
        await supabaseClient
          .from("projects")
          .update(payload)
          .eq("id", projectId);

      if (error) {
        throw error;
      }

      await registrarAuditoriaAdmin({
        clientId,
        entityType: "project",
        entityId: projectId,
        action: "project.updated",
        newData: payload
      });

      if (hasProjectUpdate) {
        const {
          data: { session }
        } = await supabaseClient.auth.getSession();
        const descriptionParts = [
          updateReady ? `O que ja esta pronto:\n${updateReady}` : "",
          updateProgressText ? `O que esta em andamento:\n${updateProgressText}` : "",
          updateNextSteps ? `Proximos passos:\n${updateNextSteps}` : "",
          updateDeadlineText ? `Previsao ou prazo:\n${updateDeadlineText}` : ""
        ].filter(Boolean);
        const updatePayload = {
          project_id: projectId,
          client_id: clientId,
          title: updateTitle,
          description: descriptionParts.join("\n\n") || updateTitle,
          progress: payload.progress,
          status: payload.status,
          created_by: session?.user?.id || null
        };

        const { error: updateError } =
          await supabaseClient
            .from("project_updates")
            .insert([updatePayload]);

        if (updateError) {
          throw updateError;
        }

        await registrarAuditoriaAdmin({
          clientId,
          entityType: "project_update",
          entityId: projectId,
          action: "project.update_published",
          newData: updatePayload
        });
      }

      if (responseMessage) {
        const {
          data: { session }
        } = await supabaseClient.auth.getSession();

        const { error: commentError } =
          await supabaseClient
            .from("project_comments")
            .insert([{
              project_id: projectId,
              client_id: clientId,
              author_user_id: session?.user?.id || null,
              author_role: "admin",
              comment_type: "admin_response",
              message: responseMessage
            }]);

        if (commentError) {
          throw commentError;
        }
      }

      mostrarToast("Projeto atualizado com sucesso.", "success");
      await carregarHistoricoProjeto(projectId);
      await carregarAtualizacoesProjetoAdmin(projectId);
      document.getElementById("projectUpdateTitle").value =
        "";
      document.getElementById("projectUpdateReady").value =
        "";
      document.getElementById("projectUpdateProgressText").value =
        "";
      document.getElementById("projectUpdateNextSteps").value =
        "";
      document.getElementById("projectUpdateDeadlineText").value =
        "";
      carregarAdminProjetos();
    } catch (error) {
      console.error(error);
      mostrarToast("Erro ao atualizar projeto.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Salvar Projeto";
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
  initEditarProjetoAdmin();
}
