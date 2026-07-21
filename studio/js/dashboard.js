import { mostrarToast } from "./notifications.js";

let briefingAtualId = null;
let approvalProjects = [];

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

function getProjectPriority(status) {
  const priorities = {
    awaiting_client_approval: 1,
    changes_requested: 2,
    in_progress: 3,
    internal_review: 4,
    draft: 5,
    approved: 6,
    completed: 7,
    cancelled: 8
  };

  return priorities[status] || 99;
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

async function carregarProjetosCliente(profile) {
  const { data, error } =
    await supabaseClient
      .from("projects")
      .select("*")
      .eq("client_id", profile.client_id)
      .order("updated_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

async function carregarAtualizacoesProjetoCliente(project) {
  if (!project?.id || !project?.client_id) return [];

  const { data, error } =
    await supabaseClient
      .from("project_updates")
      .select("*")
      .eq("project_id", project.id)
      .eq("client_id", project.client_id)
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

function selecionarProjetoAtual(projects) {
  return [...projects].sort((a, b) => {
    const priorityDiff =
      getProjectPriority(a.status) - getProjectPriority(b.status);

    if (priorityDiff !== 0) return priorityDiff;

    return new Date(b.updated_at || b.created_at || 0) -
      new Date(a.updated_at || a.created_at || 0);
  })[0] || null;
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
  const projectsContainer =
    document.getElementById("projectsContainer");

  if (!briefingsContainer || !projectsContainer) return;

  const {
    data: { session },
    error: sessionError
  } = await supabaseClient.auth.getSession();

  if (sessionError || !session) {
    window.location.href = "login.html";
    return;
  }

  const identity =
    await carregarIdentidadeStudio(session);

  if (!identity?.profile?.client_id) {
    projectsContainer.innerHTML = `
      <p>Perfil sem cliente associado.</p>
    `;
    briefingsContainer.innerHTML = `
      <p>Nenhum briefing encontrado para este utilizador.</p>
    `;
    return;
  }

  const projects =
    await carregarProjetosCliente(identity.profile);
  const projetoAtual =
    selecionarProjetoAtual(projects);

  renderProjetosCliente(projects);
  renderProjectApprovalCards(projects);

  if (projetoAtual) {
    const projectUpdates =
      await carregarAtualizacoesProjetoCliente(projetoAtual);

    renderProjectUpdates(projectUpdates);

    document.getElementById("clienteProjeto").textContent =
      projetoAtual.name || projetoAtual.service_type || "Projeto";
    document.getElementById("clienteStatus").textContent =
      getProjectStatusLabel(projetoAtual.status);
    document.getElementById("clientePrazo").textContent =
      formatDate(projetoAtual.deadline);
    document.getElementById("clienteVoucher").textContent =
      "--";
    document.getElementById("clienteProgresso").textContent =
      `${projetoAtual.progress ?? 0}%`;

    const progressFill =
      document.getElementById("clienteProgressFill");

    if (progressFill) {
      progressFill.style.width =
        `${projetoAtual.progress ?? 0}%`;
    }

    const sidebarProjetoNome =
      document.getElementById("sidebarProjetoNome");
    const sidebarProjetoStatus =
      document.getElementById("sidebarProjetoStatus");
    const sidebarProgressFill =
      document.getElementById("sidebarProgressFill");

    if (sidebarProjetoNome) {
      sidebarProjetoNome.textContent =
        projetoAtual.name || "Projeto";
    }

    if (sidebarProjetoStatus) {
      sidebarProjetoStatus.textContent =
        getProjectStatusLabel(projetoAtual.status);
    }

    if (sidebarProgressFill) {
      sidebarProgressFill.style.width =
        `${projetoAtual.progress ?? 0}%`;
    }
  } else {
    renderProjectUpdates([]);

    document.getElementById("clienteProjeto").textContent =
      "--";
    document.getElementById("clienteStatus").textContent =
      "--";
    document.getElementById("clientePrazo").textContent =
      "--";
    document.getElementById("clienteVoucher").textContent =
      "--";
    document.getElementById("clienteProgresso").textContent =
      "0%";

    const progressFill =
      document.getElementById("clienteProgressFill");
    const sidebarProjetoNome =
      document.getElementById("sidebarProjetoNome");
    const sidebarProjetoStatus =
      document.getElementById("sidebarProjetoStatus");
    const sidebarProgressFill =
      document.getElementById("sidebarProgressFill");

    if (progressFill) {
      progressFill.style.width = "0%";
    }

    if (sidebarProjetoNome) {
      sidebarProjetoNome.textContent =
        "Nenhum projeto ativo";
    }

    if (sidebarProjetoStatus) {
      sidebarProjetoStatus.textContent =
        "A definir";
    }

    if (sidebarProgressFill) {
      sidebarProgressFill.style.width = "0%";
    }
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
    return;
  }

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
}

function getUpdateSection(description, label) {
  if (!description) return "";

  const pattern =
    new RegExp(`${label}:\\n([\\s\\S]*?)(?:\\n\\n[A-ZÀ-Úa-zà-ú ]+:\\n|$)`);
  const match =
    description.match(pattern);

  return match?.[1]?.trim() || "";
}

function renderProjectUpdates(updates) {
  const container =
    document.getElementById("projectUpdatesContainer");
  const notificationBadge =
    document.querySelector(".notification-badge");

  if (!container) return;

  container.innerHTML = "";

  if (!updates || updates.length === 0) {
    if (notificationBadge) {
      notificationBadge.hidden = true;
    }

    container.innerHTML = `
      <p>Nenhuma atualizacao de projeto publicada.</p>
    `;
    return;
  }

  if (notificationBadge) {
    notificationBadge.hidden = false;
    notificationBadge.textContent =
      `Nova atualizacao: ${updates[0].title || "Projeto atualizado"}`;
  }

  updates.forEach((update, index) => {
    const card =
      document.createElement("article");
    card.classList.add("briefing-item");

    if (index === 0) {
      card.classList.add("current");
    }

    const ready =
      getUpdateSection(update.description, "O que ja esta pronto");
    const progressText =
      getUpdateSection(update.description, "O que esta em andamento");
    const nextSteps =
      getUpdateSection(update.description, "Proximos passos");

    card.innerHTML = `
      <h3>${update.title || "Atualizacao do projeto"}</h3>
      <p><strong>Status:</strong> ${getProjectStatusLabel(update.status)}</p>
      <p><strong>Progresso:</strong> ${update.progress ?? 0}%</p>
      <p><strong>Data:</strong> ${formatDate(update.created_at)}</p>
      ${ready ? `<p><strong>O que esta pronto:</strong> ${ready}</p>` : ""}
      ${progressText ? `<p><strong>Em andamento:</strong> ${progressText}</p>` : ""}
      ${nextSteps ? `<p><strong>Proximos passos:</strong> ${nextSteps}</p>` : ""}
      ${!ready && !progressText && !nextSteps ? `<p>${update.description || ""}</p>` : ""}
    `;

    container.appendChild(card);
  });
}

function renderProjetosCliente(projects) {
  const container =
    document.getElementById("projectsContainer");

  if (!container) return;

  container.innerHTML = "";

  if (!projects || projects.length === 0) {
    container.innerHTML = `
      <p>Nenhum projeto encontrado.</p>
    `;
    return;
  }

  projects.forEach((project) => {
    const card =
      document.createElement("article");
    card.classList.add("briefing-item");

    const title =
      document.createElement("h3");
    title.textContent =
      project.name || "Projeto";

    const service =
      document.createElement("p");
    service.innerHTML =
      `<strong>Tipo:</strong> ${project.service_type || "Nao informado"}`;

    const status =
      document.createElement("p");
    status.innerHTML =
      `<strong>Status:</strong> ${getProjectStatusLabel(project.status)}`;

    const progress =
      document.createElement("p");
    progress.innerHTML =
      `<strong>Progresso:</strong> ${project.progress ?? 0}%`;

    const deadline =
      document.createElement("p");
    deadline.innerHTML =
      `<strong>Prazo:</strong> ${formatDate(project.deadline)}`;

    const updated =
      document.createElement("span");
    updated.classList.add("briefing-badge");
    updated.textContent =
      `Atualizado em ${formatDate(project.updated_at || project.created_at)}`;

    card.append(title, service, status, progress, deadline, updated);

    if (isValidUrl(project.preview_url)) {
      const link =
        document.createElement("a");
      link.classList.add("btn");
      link.href =
        project.preview_url;
      link.target =
        "_blank";
      link.rel =
        "noopener noreferrer";
      link.textContent =
        "Visualizar Projeto";
      card.appendChild(link);
    }

    container.appendChild(card);
  });
}

function isValidUrl(value) {
  try {
    const url =
      new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function renderProjectApprovalCards(projects) {
  const section =
    document.getElementById("projectApprovalSection");
  const container =
    document.getElementById("projectApprovalCards");

  if (!section || !container) return;

  approvalProjects =
    (projects || []).filter(
      (project) => project.status === "awaiting_client_approval"
    );

  if (approvalProjects.length === 0) {
    section.hidden = true;
    container.innerHTML = "";
    return;
  }

  section.hidden = false;
  container.innerHTML = "";

  approvalProjects.forEach((project) => {
    const card =
      document.createElement("article");
    card.classList.add("briefing-item");

    const previewHtml =
      isValidUrl(project.preview_url)
        ? `<a class="btn" href="${project.preview_url}" target="_blank" rel="noopener noreferrer">Visualizar Projeto</a>`
        : "";

    card.innerHTML = `
      <h3>${project.name || "Projeto"}</h3>
      <p><strong>Progresso:</strong> ${project.progress ?? 0}%</p>
      <p><strong>Prazo:</strong> ${formatDate(project.deadline)}</p>
      <p><strong>Solicitado em:</strong> ${formatDate(project.approval_requested_at)}</p>
      <p>${project.description || "Revise a demonstracao e informe a sua decisao."}</p>
      <div class="modal-actions">
        ${previewHtml}
        <button class="btn approveProjectBtn" type="button" data-project-id="${project.id}">
          Aprovar Projeto
        </button>
        <button class="btn-secondary requestChangesBtn" type="button" data-project-id="${project.id}">
          Solicitar Alteracoes
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

function getApprovalProjectById(projectId) {
  return approvalProjects.find(
    (project) => project.id === projectId
  ) || null;
}
async function aprovarProjetoAtual(project, approveButton) {
  if (!project) return;

  const confirmar =
    confirm("Confirma a aprovacao final deste projeto?");

  if (!confirmar) return;
  if (approveButton?.disabled) return;

  if (approveButton) {
    approveButton.disabled = true;
    approveButton.textContent = "Aprovando...";
  }

  try {
    const rpcResult =
      await supabaseClient.rpc("approve_studio_project", {
        p_project_id: project.id
      });

    if (rpcResult.error) {
      const message =
        `${rpcResult.error.message || ""} ${rpcResult.error.details || ""}`;

      if (!/function|schema cache|not found/i.test(message)) {
        throw rpcResult.error;
      }

      const payload = {
        status: "approved",
        approved_at: new Date().toISOString()
      };

      const { error } =
        await supabaseClient
          .from("projects")
          .update(payload)
          .eq("id", project.id);

      if (error) {
        throw error;
      }

      await registrarAuditoriaCliente({
        clientId: project.client_id,
        entityType: "project",
        entityId: project.id,
        action: "project.approved",
        newData: payload
      });
    }

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
  const approvalContainer =
    document.getElementById("projectApprovalCards");
  const requestChangesModal =
    document.getElementById("requestChangesModal");
  const closeRequestChangesModal =
    document.getElementById("closeRequestChangesModal");
  const requestChangesForm =
    document.getElementById("requestChangesForm");
  const requestChangesInput =
    document.getElementById("requestChangesInput");

  let selectedProject = null;

  approvalContainer?.addEventListener("click", async (event) => {
    const approveButton =
      event.target.closest(".approveProjectBtn");
    const changesButton =
      event.target.closest(".requestChangesBtn");

    if (approveButton) {
      const project =
        getApprovalProjectById(approveButton.dataset.projectId);
      await aprovarProjetoAtual(project, approveButton);
      return;
    }

    if (changesButton) {
      selectedProject =
        getApprovalProjectById(changesButton.dataset.projectId);

      if (!selectedProject || !requestChangesModal) return;

      requestChangesModal.classList.add("active");
      requestChangesInput?.focus();
    }
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

    if (!selectedProject) return;

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
      const rpcResult =
        await supabaseClient.rpc("request_studio_project_changes", {
          p_project_id: selectedProject.id,
          p_message: message
        });

      if (rpcResult.error) {
        const rpcMessage =
          `${rpcResult.error.message || ""} ${rpcResult.error.details || ""}`;

        if (!/function|schema cache|not found/i.test(rpcMessage)) {
          throw rpcResult.error;
        }

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
              project_id: selectedProject.id,
              client_id: selectedProject.client_id,
              author_user_id: session.user.id,
              author_role: "client",
              comment_type: "change_request",
              message
            }]);

        if (commentError) {
          throw commentError;
        }

        const { error: projectError } =
          await supabaseClient
            .from("projects")
            .update({ status: "changes_requested" })
            .eq("id", selectedProject.id);

        if (projectError) {
          throw projectError;
        }

        await registrarAuditoriaCliente({
          clientId: selectedProject.client_id,
          entityType: "project",
          entityId: selectedProject.id,
          action: "project.changes_requested",
          newData: { message }
        });
      }

      requestChangesInput.value = "";
      requestChangesModal?.classList.remove("active");
      mostrarToast("Pedido de alteracoes enviado com sucesso.", "success");
      selectedProject = null;
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

  const identity =
    await carregarIdentidadeStudio(session);

  if (!identity?.profile?.client_id) return;

  const projects =
    await carregarProjetosCliente(identity.profile);
  const projetoAtual =
    selecionarProjetoAtual(projects);

  if (!projetoAtual) {
    projectTimeline.innerHTML = `
      <p>Nenhum projeto ativo.</p>
    `;
    return;
  }

  const etapasProjeto = [
    "draft",
    "in_progress",
    "internal_review",
    "awaiting_client_approval",
    "approved",
    "completed"
  ];
  const etapaAtualProjetoIndex =
    etapasProjeto.indexOf(projetoAtual.status);

  projectTimeline.innerHTML = "";

  etapasProjeto.forEach((etapa, index) => {
    const div =
      document.createElement("div");

    div.classList.add("timeline-item");

    if (index < etapaAtualProjetoIndex) {
      div.classList.add("completed");
    } else if (index === etapaAtualProjetoIndex) {
      div.classList.add("current");
    } else {
      div.classList.add("pending");
    }

    div.innerHTML = `
      <strong>
        ${getProjectStatusLabel(etapa)}
      </strong>

      <span>
        ${
          index < etapaAtualProjetoIndex
            ? "Etapa concluida"
            : index === etapaAtualProjetoIndex
            ? "Etapa atual"
            : "Aguardando inicio"
        }
      </span>
    `;

    projectTimeline.appendChild(div);
  });

  return;

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

  const identity =
    await carregarIdentidadeStudio(session);

  if (!identity?.profile?.client_id) return;

  const projects =
    await carregarProjetosCliente(identity.profile);
  const projetoAtual =
    selecionarProjetoAtual(projects);

  if (!projetoAtual) {
    progressoTexto.textContent =
      "0%";
    progressoFill.style.width =
      "0%";
    return;
  }

  const progresso =
    projetoAtual.progress ?? 0;

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
