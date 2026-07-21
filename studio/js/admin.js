import { carregarComentariosAdmin } from "./comments.js";
import { mostrarToast } from "./notifications.js";
import { carregarAdminUploads } from "./uploads.js";
import { carregarAdminVouchers } from "./vouchers.js";

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
    verBtn.classList.add("verBtn");
    verBtn.dataset.id =
      cliente.id;
    verBtn.textContent =
      "Ver";
    verBtn.disabled = true;
    verBtn.title = "Detalhe do cliente sera aberto em modulo proprio.";
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

export function initAdmin() {
  if (window.location.pathname.includes("admin.html")) {
    carregarAdminReal();
  }

  initAdminMenu();
  carregarCardsAdmin();
  initAdminModals();
  initAdminFiltros();
}
