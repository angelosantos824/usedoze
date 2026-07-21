let briefingAtualId = null;

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

  const { data, error } = await supabaseClient
    .from("briefings")
    .select("*")
    .eq("email", session.user.email)
    .order("created_at", { ascending: false });

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
    await supabaseClient
      .from("briefings")
      .select("*")
      .eq("email", session.user.email)
      .limit(1);

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
    await supabaseClient
      .from("briefings")
      .select("status")
      .eq("email", session.user.email)
      .limit(1);

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
}
