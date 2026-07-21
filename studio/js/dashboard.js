import { mostrarToast } from "./notifications.js";

let briefingAtualId = null;
let approvalProject = null;

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

function formatDate(value) {
  if (!value) return "A definir";

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) return "A definir";

  return date.toLocaleDateString("pt-PT");
}

async function carregarIdentidadeStudio(session) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,nome,email,client_id,clients(id,name,contact_name,email,status,type)")
    .eq("id", session.user.id)
    .single();

  if (error || !data) {
    console.error("DOZEDEV_STUDIO_ERROR", {
      modulo: "dashboard",
      acao: "load_profile_client",
      mensagem: error?.message || "Perfil nao encontrado.",
      details: error
    });
    return null;
  }

  return {
    profile: data,
    client: data.clients || null
  };
}

async function registrarAuditoriaCliente({
  clientId,
  entityType,
  entityId,
  action,
  newData
}) {
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
          source: "studio_dashboard"
        }
      }]);

  if (error) {
    console.warn("Nao foi possivel registrar auditoria.", error);
  }
}

async function carregarProjetoAtualCliente(session) {
  const identity =
    await carregarIdentidadeStudio(session);

  if (!identity?.profile?.client_id) {
    return null;
  }

  const { data, error } =
    await supabaseClient
      .from("projects")
      .select("*")
      .eq("client_id", identity.profile.client_id)
      .order("updated_at", {
        ascending: false
      })
      .limit(1);

  if (error) {
    console.error(error);
    return null;
  }

  return data?.[0] || null;
}

async function carregarBriefingsCliente(session, columns = "*", limit = null) {
  const identity =
    await carregarIdentidadeStudio(session);
  let query =
    supabaseClient
      .from("briefings")
      .select(columns);

  if (identity?.profile?.client_id) {
    query =
      query.eq("client_id", identity.profile.client_id);
  } else {
    query =
      query.eq("email", session.user.email);
  }

  query =
    query.order("created_at", {
      ascending: false
    });

  if (limit) {
    query =
      query.limit(limit);
  }

  const result =
    await query;

  if (!result.error || !identity?.profile?.client_id) {
    return result;
  }

  const message =
    `${result.error.message || ""} ${result.error.details || ""}`;

  if (!/client_id|schema cache|column/i.test(message)) {
    return result;
  }

  let fallback =
    supabaseClient
      .from("briefings")
      .select(columns)
      .eq("email", session.user.email)
      .order("created_at", {
        ascending: false
      });

  if (limit) {
    fallback =
      fallback.limit(limit);
  }

  return fallback;
}

export async function carregarDashboard() {
  const briefingsContainer =
    document.getElementById("briefingsContainer");

  if (!briefingsContainer) return;

  const {
    data: { session },
    error: sessionError
  } = await supabaseClient.auth.getSession();

  if (sessionError || !session) {
    window.location.href = "login.html";
    return;
  }

  const { data, error } =
    await carregarBriefingsCliente(session);

  if (error) {
    console.error(error);
    briefingsContainer.innerHTML = `
      <p>Erro ao carregar seus briefings.</p>
    `;
    return;
  }

  briefingsContainer.innerHTML = "";

  if (!data || data.length === 0) {
    briefingsContainer.innerHTML = `
      <p>Nenhum briefing encontrado para este utilizador.</p>
    `;
    const projetoAtual =
      await carregarProjetoAtualCliente(session);

    if (projetoAtual) {
      document.getElementById("clienteProjeto").textContent =
        projetoAtual.name || projetoAtual.service_type || "Projeto";
      document.getElementById("clienteStatus").textContent =
        getProjectStatusLabel(projetoAtual.status);
      document.getElementById("clientePrazo").textContent =
        formatDate(projetoAtual.deadline);
      renderProjectApprovalCard(projetoAtual);
    }
    return;
  }

  const briefingPrincipal = data[0];

  document.getElementById("clienteProjeto").textContent =
    briefingPrincipal.tipo_projeto || "Projeto Web";
  document.getElementById("clienteStatus").textContent =
    briefingPrincipal.status || "Recebido";
  document.getElementById("clientePrazo").textContent =
    briefingPrincipal.prazo || "A definir";
  document.getElementById("clienteVoucher").textContent =
    briefingPrincipal.voucher_codigo || "Nenhum";

  data.forEach((briefing) => {
    const card = document.createElement("article");
    card.classList.add("briefing-item");

    const titulo = document.createElement("h3");
    titulo.textContent = briefing.nome || "Sem nome";

    const empresa = document.createElement("p");
    const empresaStrong = document.createElement("strong");
    empresaStrong.textContent = "Empresa: ";
    empresa.appendChild(empresaStrong);
    empresa.append(
      document.createTextNode(
        briefing.empresa || "Não informado"
      )
    );

    const projeto = document.createElement("p");
    const projetoStrong = document.createElement("strong");
    projetoStrong.textContent = "Projeto: ";
    projeto.appendChild(projetoStrong);
    projeto.append(
      document.createTextNode(
        briefing.tipo_projeto || "Projeto web"
      )
    );

    const status = document.createElement("p");
    const statusStrong = document.createElement("strong");
    statusStrong.textContent = "Status: ";
    status.appendChild(statusStrong);
    status.append(
      document.createTextNode(briefing.status || "Recebido")
    );

    const badge = document.createElement("span");
    badge.classList.add("briefing-badge");
    badge.textContent = briefing.paginas || "Sem páginas";

    card.appendChild(titulo);
    card.appendChild(empresa);
    card.appendChild(projeto);
    card.appendChild(status);
    card.appendChild(badge);

    card.addEventListener("click", () => {
      abrirModalBriefing(briefing);
    });

    briefingsContainer.appendChild(card);
  });

  const projetoAtual =
    await carregarProjetoAtualCliente(session);

  if (projetoAtual) {
    document.getElementById("clienteProjeto").textContent =
      projetoAtual.name || projetoAtual.service_type || "Projeto";
    document.getElementById("clienteStatus").textContent =
      getProjectStatusLabel(projetoAtual.status);
    document.getElementById("clientePrazo").textContent =
      formatDate(projetoAtual.deadline);
  }

  renderProjectApprovalCard(projetoAtual);
}

function renderProjectApprovalCard(project) {
  const section =
    document.getElementById("projectApprovalSection");

  if (!section) return;

  approvalProject =
    project?.status === "awaiting_client_approval" ? project : null;

  if (!approvalProject) {
    section.hidden = true;
    return;
  }

  section.hidden = false;

  document.getElementById("approvalProjectName").textContent =
    approvalProject.name || "Projeto";
  document.getElementById("approvalProjectStatus").textContent =
    getProjectStatusLabel(approvalProject.status);
  document.getElementById("approvalProjectProgress").textContent =
    `${approvalProject.progress ?? 0}%`;
  document.getElementById("approvalProjectDeadline").textContent =
    formatDate(approvalProject.deadline);
  document.getElementById("approvalProjectRequestedAt").textContent =
    formatDate(approvalProject.approval_requested_at);

  const previewLink =
    document.getElementById("approvalPreviewLink");

  if (previewLink) {
    previewLink.href =
      approvalProject.preview_url || "#";
    previewLink.toggleAttribute(
      "aria-disabled",
      !approvalProject.preview_url
    );
  }
}

async function aprovarProjetoAtual() {
  if (!approvalProject) return;

  const confirmar =
    confirm("Confirma a aprovacao final deste projeto?");

  if (!confirmar) return;

  const approveButton =
    document.getElementById("approveProjectBtn");

  if (approveButton?.disabled) return;

  if (approveButton) {
    approveButton.disabled = true;
    approveButton.textContent = "Aprovando...";
  }

  try {
    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
      window.location.href = "login.html";
      return;
    }

    const payload = {
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: session.user.id
    };

    const { error } =
      await supabaseClient
        .from("projects")
        .update(payload)
        .eq("id", approvalProject.id);

    if (error) {
      throw error;
    }

    await supabaseClient
      .from("project_comments")
      .insert([{
        project_id: approvalProject.id,
        client_id: approvalProject.client_id,
        author_user_id: session.user.id,
        author_role: "client",
        comment_type: "approval",
        message: "Projeto aprovado pelo cliente."
      }]);

    await registrarAuditoriaCliente({
      clientId: approvalProject.client_id,
      entityType: "project",
      entityId: approvalProject.id,
      action: "project.approved",
      newData: payload
    });

    mostrarToast("Projeto aprovado com sucesso.", "success");
    await carregarDashboard();
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao aprovar projeto.", "error");
  } finally {
    if (approveButton) {
      approveButton.disabled = false;
      approveButton.textContent = "Aprovar Projeto";
    }
  }
}

function initProjectApprovalFlow() {
  const approveProjectBtn =
    document.getElementById("approveProjectBtn");
  const requestChangesBtn =
    document.getElementById("requestChangesBtn");
  const requestChangesModal =
    document.getElementById("requestChangesModal");
  const closeRequestChangesModal =
    document.getElementById("closeRequestChangesModal");
  const requestChangesForm =
    document.getElementById("requestChangesForm");
  const requestChangesInput =
    document.getElementById("requestChangesInput");

  approveProjectBtn?.addEventListener("click", aprovarProjetoAtual);

  requestChangesBtn?.addEventListener("click", () => {
    if (!approvalProject || !requestChangesModal) return;
    requestChangesModal.classList.add("active");
    requestChangesInput?.focus();
  });

  closeRequestChangesModal?.addEventListener("click", () => {
    requestChangesModal?.classList.remove("active");
  });

  requestChangesModal?.addEventListener("click", (event) => {
    if (event.target === requestChangesModal) {
      requestChangesModal.classList.remove("active");
    }
  });

  requestChangesForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!approvalProject) return;

    const message =
      requestChangesInput?.value.trim() || "";

    if (!message) {
      mostrarToast("Descreva as alteracoes desejadas.", "error");
      return;
    }

    const submitButton =
      requestChangesForm.querySelector('button[type="submit"]');

    if (submitButton?.disabled) return;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";
    }

    try {
      const {
        data: { session }
      } = await supabaseClient.auth.getSession();

      if (!session) {
        window.location.href = "login.html";
        return;
      }

      const { error: commentError } =
        await supabaseClient
          .from("project_comments")
          .insert([{
            project_id: approvalProject.id,
            client_id: approvalProject.client_id,
            author_user_id: session.user.id,
            author_role: "client",
            comment_type: "change_request",
            message
          }]);

      if (commentError) {
        throw commentError;
      }

      const payload = {
        status: "changes_requested"
      };

      const { error: projectError } =
        await supabaseClient
          .from("projects")
          .update(payload)
          .eq("id", approvalProject.id);

      if (projectError) {
        throw projectError;
      }

      await registrarAuditoriaCliente({
        clientId: approvalProject.client_id,
        entityType: "project",
        entityId: approvalProject.id,
        action: "project.changes_requested",
        newData: {
          message
        }
      });

      requestChangesInput.value = "";
      requestChangesModal?.classList.remove("active");
      mostrarToast("Pedido de alteracoes enviado com sucesso.", "success");
      await carregarDashboard();
    } catch (error) {
      console.error(error);
      mostrarToast("Erro ao solicitar alteracoes.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Enviar Pedido";
      }
    }
  });
}

export function abrirModalBriefing(briefing) {
  const modal = document.getElementById("briefingModal");

  if (!modal) return;

  briefingAtualId = briefing.id;

  document.getElementById("modalClienteNome").textContent =
    briefing.nome || "Detalhes do Briefing";
  document.getElementById("modalEmpresa").textContent =
    briefing.empresa || "Não informado";
  document.getElementById("modalEmail").textContent =
    briefing.email || "Não informado";
  document.getElementById("modalTelefone").textContent =
    briefing.telefone || "Não informado";
  document.getElementById("modalInstagram").textContent =
    briefing.instagram || "Não informado";
  document.getElementById("modalTipo").textContent =
    briefing.tipo_projeto || "Normal";
  document.getElementById("modalVoucher").textContent =
    briefing.voucher_codigo || "Não informado";
  document.getElementById("modalPaginas").textContent =
    briefing.paginas || "Não informado";
  document.getElementById("modalPrazo").textContent =
    briefing.prazo || "Não informado";
  document.getElementById("modalStatus").textContent =
    briefing.status || "Recebido";
  document.getElementById("modalDescricao").textContent =
    briefing.descricao || "Sem descrição.";
  document.getElementById("modalFuncionalidades").textContent =
    briefing.funcionalidades?.join(", ") || "Não informado";

  modal.classList.add("active");
}

export async function carregarTimelineProjeto() {
  const projectTimeline =
    document.getElementById("projectTimeline");

  if (!projectTimeline) return;

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) return;

  const { data: briefings } =
    await carregarBriefingsCliente(session, "*", 1);

  if (!briefings || briefings.length === 0) return;

  const statusAtual =
    briefings[0].status || "Recebido";

  const etapas = [
    "Recebido",
    "Planejamento",
    "Design",
    "Em desenvolvimento",
    "Revisão",
    "Finalizado"
  ];

  projectTimeline.innerHTML = "";

  const etapaAtualIndex =
    etapas.indexOf(statusAtual);

  etapas.forEach((etapa, index) => {
    const div =
      document.createElement("div");

    div.classList.add("timeline-item");

    if (index < etapaAtualIndex) {
      div.classList.add("completed");
    } else if (index === etapaAtualIndex) {
      div.classList.add("current");
    } else {
      div.classList.add("pending");
    }

    div.innerHTML = `
      <strong>
        ${etapa}
      </strong>

      <span>
        ${
          index < etapaAtualIndex
            ? "Etapa concluída"
            : index === etapaAtualIndex
            ? "Etapa atual"
            : "Aguardando início"
        }
      </span>
    `;

    projectTimeline.appendChild(div);
  });
}

export async function carregarProgressoProjeto() {
  const progressoTexto =
    document.getElementById("clienteProgresso");
  const progressoFill =
    document.getElementById("clienteProgressFill");

  if (!progressoTexto || !progressoFill) return;

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) return;

  const { data: briefings } =
    await carregarBriefingsCliente(session, "status", 1);

  if (!briefings || briefings.length === 0) return;

  const status =
    briefings[0].status || "Recebido";

  const progressoPorStatus = {
    "Recebido": 15,
    "Planejamento": 30,
    "Design": 45,
    "Em desenvolvimento": 65,
    "Revisão": 80,
    "Aguardando cliente": 90,
    "Finalizado": 100
  };

  const progresso =
    progressoPorStatus[status] || 15;

  progressoTexto.textContent =
    `${progresso}%`;
  progressoFill.style.width =
    `${progresso}%`;
}

export async function carregarSidebarUser() {
  const userName =
    document.getElementById("sidebarUserName");
  const userAvatar =
    document.getElementById("sidebarAvatar");
  const topbarUser =
    document.querySelector(".admin-user");

  if (!userName || !userAvatar) return;

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) return;

  const identity = await carregarIdentidadeStudio(session);

  if (!identity) {
    userName.textContent = "Perfil incompleto";
    userAvatar.textContent = "!";
    if (topbarUser) {
      topbarUser.textContent = "Perfil incompleto";
    }
    return;
  }

  const displayName =
    identity.profile.nome ||
    identity.client?.contact_name ||
    identity.client?.name ||
    session.user.email;
  const companyName =
    identity.client?.name || "Cliente sem empresa associada";

  userName.textContent = displayName;
  userAvatar.textContent =
    displayName.charAt(0).toUpperCase();

  const userInfoSubtitle =
    document.querySelector(".sidebar-user-info span");
  if (userInfoSubtitle) {
    userInfoSubtitle.textContent = companyName;
  }

  if (topbarUser) {
    topbarUser.textContent = displayName;
  }
}

function initBriefingModalClose() {
  const closeBriefingModal =
    document.getElementById("closeBriefingModal");
  const briefingModal =
    document.getElementById("briefingModal");

  if (!closeBriefingModal || !briefingModal) return;

  closeBriefingModal.addEventListener("click", () => {
    briefingModal.classList.remove("active");
  });

  briefingModal.addEventListener("click", (event) => {
    if (event.target === briefingModal) {
      briefingModal.classList.remove("active");
    }
  });
}

export function initDashboard() {
  carregarDashboard();
  carregarTimelineProjeto();
  carregarProgressoProjeto();
  carregarSidebarUser();
  initBriefingModalClose();
  initProjectApprovalFlow();
}
