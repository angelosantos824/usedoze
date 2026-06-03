document.addEventListener("DOMContentLoaded", () => {

    let briefingAtualId = null;

    /* ==========================================
   PROTEGER PÁGINAS PRIVADAS
========================================== */

async function protegerPaginasPrivadas() {

  const paginasPrivadas = [
    "dashboard.html",
    "admin.html",
    "briefing.html"
  ];

  const paginaAtual =
    window.location.pathname.split("/").pop();

  if (!paginasPrivadas.includes(paginaAtual)) {
    return;
  }

  if (typeof supabaseClient === "undefined") {

    alert("Erro: Supabase não carregou.");

    window.location.href = "login.html";

    return;
  }

  const {
  data: { session },
  error
} = await supabaseClient.auth.getSession();

if (error || !session){
    alert(
      "Faça login para acessar o DOZEDEV Studio."
    );

    window.location.href = "login.html";
  }

}

protegerPaginasPrivadas();

/* ==========================================
   PROTEGER ÁREA ADMIN
========================================== */

async function protegerAdmin() {

  const paginaAtual =
    window.location.pathname.split("/").pop();

  if (paginaAtual !== "admin.html") {
    return;
  }

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (error || !data) {

    alert("Perfil não encontrado.");

    window.location.href = "dashboard.html";

    return;
  }

  if (data.role !== "admin") {

    alert(
      "Acesso permitido apenas para administradores."
    );

    window.location.href = "dashboard.html";

  }

}

protegerAdmin();

 /* ==========================================
   DASHBOARD CLIENTE - DADOS REAIS
========================================== */

async function carregarDashboard() {

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

  const emailCliente =
    session.user.email;

  const { data, error } = await supabaseClient
    .from("briefings")
    .select("*")
    .eq("email", emailCliente)
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

    const card =
      document.createElement("article");

    card.classList.add("briefing-item");

    card.innerHTML = `

      <h3>
        ${briefing.nome || "Sem nome"}
      </h3>

      <p>
        <strong>Empresa:</strong>
        ${briefing.empresa || "Não informado"}
      </p>

      <p>
        <strong>Projeto:</strong>
        ${briefing.tipo_projeto || "Projeto web"}
      </p>

      <p>
        <strong>Status:</strong>
        ${briefing.status || "Recebido"}
      </p>

      <span class="briefing-badge">
        ${briefing.paginas || "Sem páginas"}
      </span>

    `;

    card.addEventListener("click", () => {
      abrirModalBriefing(briefing);
    });

    briefingsContainer.appendChild(card);

  });

}

carregarDashboard();

function abrirModalBriefing(briefing) {

  const modal =
    document.getElementById("briefingModal");

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
  
/* ==========================================
   LOGOUT
========================================== */

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

  logoutBtn.addEventListener("click", async () => {

    const confirmar = confirm("Deseja sair do DOZEDEV Studio?");

    if (!confirmar) return;

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "login.html";

  });

}
  
  /* ==========================================
     BRIEFING / VOUCHER
  ========================================== */

  const tipoProjetoInputs = document.querySelectorAll(
    'input[name="tipoProjeto"]'
  );

  const voucherModal = document.getElementById("voucherModal");
  const closeVoucherModal = document.getElementById("closeVoucherModal");
  const acceptVoucherRules = document.getElementById("acceptVoucherRules");
  const cancelVoucherRules = document.getElementById("cancelVoucherRules");

  const voucherCodeGroup = document.getElementById("voucherCodeGroup");
  const voucherCode = document.getElementById("voucherCode");
  const voucherAlert = document.getElementById("voucherAlert");

  const quantidadePaginas = document.getElementById("quantidadePaginas");
  const prazoDesejado = document.getElementById("prazoDesejado");

  const funcionalidades = document.querySelectorAll(
    ".funcionalidade"
  );

  /* ==========================================
   GERADOR DE VOUCHER
========================================== */

const gerarVoucherBtn =
  document.getElementById("gerarVoucherBtn");

const voucherList =
  document.getElementById("voucherList");

function gerarCodigoVoucher() {

  const numero =
    String(
      Math.floor(Math.random() * 9999)
    ).padStart(4, "0");

  return `VOUCHERDOZE-${numero}`;

}

async function carregarVouchers() {

  if (!voucherList) return;

  const { data, error } =
    await supabaseClient
      .from("vouchers")
      .select("*")
      .order("criado_em", {
        ascending: false
      });

  if (error) {

    console.error(error);

    mostrarToast(
      "Erro ao carregar vouchers.",
      "error"
    );

    return;

  }

  voucherList.innerHTML = "";

  data.forEach((voucher) => {

    const card =
      document.createElement("div");

    card.classList.add("voucher-card");

    card.innerHTML = `

      <h3>
        ${voucher.codigo}
      </h3>

      <p>
        Limite:
        ${voucher.limite_uso}
      </p>

      <p>
        Usos:
        ${voucher.usos}
      </p>

      <span>
        ${voucher.ativo ? "Ativo" : "Inativo"}
      </span>

      <button
        class="voucher-toggle-btn"
        data-id="${voucher.id}"
        data-ativo="${voucher.ativo}"
        type="button"
      >
        ${voucher.ativo ? "Desativar" : "Reativar"}
      </button>

    `;

    voucherList.appendChild(card);

    const toggleBtn =
      card.querySelector(".voucher-toggle-btn");

    if (toggleBtn) {

      toggleBtn.addEventListener(
        "click",
        async () => {

          const id =
            toggleBtn.dataset.id;

          const ativoAtual =
            toggleBtn.dataset.ativo === "true";

          const { error } =
            await supabaseClient
              .from("vouchers")
              .update({
                ativo: !ativoAtual
              })
              .eq("id", id);

          if (error) {

            console.error(error);

            mostrarToast(
              "Erro ao atualizar voucher.",
              "error"
            );

            return;

          }

          carregarVouchers();

          mostrarToast(
            ativoAtual
              ? "Voucher desativado."
              : "Voucher reativado.",
            "success"
          );

        }
      );

    }

  });

}

if (gerarVoucherBtn) {

  gerarVoucherBtn.addEventListener(
    "click",
    async () => {

      const codigo =
        gerarCodigoVoucher();

      const validade =
        new Date();

      validade.setDate(
        validade.getDate() + 30
      );

      const { error } =
        await supabaseClient
          .from("vouchers")
          .insert([{

            codigo,

            validade,

            ativo: true,

            limite_uso: 1

          }]);

      if (error) {

        console.error(error);

        mostrarToast(
          "Erro ao gerar voucher.",
          "error"
        );

        return;

      }

      mostrarToast(
        "Voucher criado com sucesso!",
        "success"
      );

      carregarVouchers();

    }
  );

}

carregarVouchers();

  /* ==========================================
     MODAL
  ========================================== */

  function abrirModalVoucher() {

    if (voucherModal) {
      voucherModal.classList.add("active");
    }

  }

  function fecharModalVoucher() {

    if (voucherModal) {
      voucherModal.classList.remove("active");
    }

  }

  /* ==========================================
     ATIVAR VOUCHER
  ========================================== */

  function ativarVoucher() {

    abrirModalVoucher();
    const codigo =
      voucherCode?.value.trim();

    if (voucherCodeGroup) {
      voucherCodeGroup.style.display = "flex";
    }

    if (voucherCode) {

      voucherCode.setAttribute(
        "required",
        "required"
      );

      voucherCode.placeholder =
        "Ex: VOUCHERDOZE-0001";

    }

    if (voucherAlert) {

      voucherAlert.classList.add("active");

      voucherAlert.textContent =
        "Voucher promocional selecionado: limite de 3 páginas, prazo de até 30 dias e funcionalidades específicas.";

    }

    if (quantidadePaginas) {

      quantidadePaginas.value = "3 Páginas";

      quantidadePaginas.disabled = true;

    }

    if (prazoDesejado) {

      prazoDesejado.value = "Até 30 dias";

      prazoDesejado.readOnly = true;

    }

    funcionalidades.forEach((item) => {

      if (
        item.classList.contains("voucher-func")
      ) {

        item.checked = true;

        item.disabled = false;

      } else {

        item.checked = false;

        item.disabled = true;

      }

    });

  }

  /* ==========================================
     DESATIVAR VOUCHER
  ========================================== */

  function desativarVoucher() {

    fecharModalVoucher();

    if (voucherCodeGroup) {
      voucherCodeGroup.style.display = "none";
    }

    if (voucherCode) {

      voucherCode.removeAttribute("required");

      voucherCode.value = "";

    }

    if (voucherAlert) {

      voucherAlert.classList.remove("active");

      voucherAlert.textContent = "";

    }

    if (quantidadePaginas) {

      quantidadePaginas.disabled = false;

      quantidadePaginas.value = "";

    }

    if (prazoDesejado) {

      prazoDesejado.readOnly = false;

      prazoDesejado.value = "";

    }

    funcionalidades.forEach((item) => {

      item.disabled = false;

      item.checked = false;

    });

    const normalRadio = document.querySelector(
      'input[name="tipoProjeto"][value="normal"]'
    );

    if (normalRadio) {

      normalRadio.checked = true;

    }

  }

  /* ==========================================
     ALTERAR TIPO PROJETO
  ========================================== */

  tipoProjetoInputs.forEach((input) => {

    input.addEventListener("change", () => {

      if (
        input.value === "voucher" &&
        input.checked
      ) {

        ativarVoucher();

      }

      if (
        input.value === "normal" &&
        input.checked
      ) {

        desativarVoucher();

      }

    });

  });

  /* ==========================================
     FECHAR MODAL
  ========================================== */

  if (closeVoucherModal) {

    closeVoucherModal.addEventListener(
      "click",
      () => {

        fecharModalVoucher();

      }
    );

  }

  if (acceptVoucherRules) {

    acceptVoucherRules.addEventListener(
      "click",
      () => {

        fecharModalVoucher();

        if (voucherCode) {

          voucherCode.focus();

        }

      }
    );

  }

  if (cancelVoucherRules) {

    cancelVoucherRules.addEventListener(
      "click",
      () => {

        desativarVoucher();

      }
    );

  }

  if (voucherModal) {

    voucherModal.addEventListener(
      "click",
      (event) => {

        if (event.target === voucherModal) {

          fecharModalVoucher();

        }

      }
    );

  }

/* ==========================================
   VALIDAR VOUCHER
========================================== */

async function validarVoucher(codigo) {

  if (!codigo) {
    return false;
  }

  const { data, error } =
    await supabaseClient
      .from("vouchers")
      .select("*")
      .eq("codigo", codigo)
      .single();

  if (error || !data) {

    alert("Voucher inválido.");

    return false;

  }

  if (!data.ativo) {

    alert("Voucher desativado.");

    return false;

  }

  const hoje = new Date();
  const validade =
    new Date(data.validade);

  if (hoje > validade) {

    alert("Voucher expirado.");

    return false;

  }

  if (data.usos >= data.limite_uso) {

    alert(
      "Voucher já utilizado."
    );

    return false;

  }

  return data;

}

/* ==========================================
   ENVIAR BRIEFING
========================================== */

const briefingForm = document.getElementById("briefingForm");

if (briefingForm) {

  briefingForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    try {

      const funcionalidadesSelecionadas = [];

      document
        .querySelectorAll(".funcionalidade:checked")
        .forEach((item) => {
          funcionalidadesSelecionadas.push(item.value);
        });
      
        let voucherValidado = null;

const tipoProjetoSelecionado =
  document.querySelector(
    'input[name="tipoProjeto"]:checked'
  )?.value;

if (
  tipoProjetoSelecionado ===
  "voucher"
) {

  voucherValidado =
    await validarVoucher(
      voucherCode?.value.trim()
    );

  if (!voucherValidado) {
    return;
  }

}

      const dadosBriefing = {

        nome:
          document.getElementById("nome")?.value || "",

        email:
          document.getElementById("email")?.value || "",

        telefone:
          document.getElementById("telefone")?.value || "",

        empresa:
          document.getElementById("empresa")?.value || "",

        instagram:
          document.getElementById("instagram")?.value || "",

        tipo_projeto:
          document.querySelector('input[name="tipoProjeto"]:checked')?.value || "normal",

        voucher_codigo:
          document.getElementById("voucherCode")?.value || "",

        paginas:
          document.getElementById("quantidadePaginas")?.value || "",

        prazo:
          document.getElementById("prazoDesejado")?.value || "",

        descricao:
          document.getElementById("descricaoProjeto")?.value || "",

        funcionalidades:
          funcionalidadesSelecionadas

      };

      const { error } = await supabaseClient
        .from("briefings")
        .insert([dadosBriefing]);

      if (error) {
        console.error(error);
        alert("Erro ao enviar briefing.");
        return;
      }

      if (voucherValidado) {

  const novosUsos =
    voucherValidado.usos + 1;

  const limiteAtingido =
    novosUsos >= voucherValidado.limite_uso;

  await supabaseClient
    .from("vouchers")
    .update({

      usos: novosUsos,

      ativo: !limiteAtingido

    })
    .eq("id", voucherValidado.id);

}

      mostrarToast("Briefing enviado com sucesso!", "success");

      briefingForm.reset();

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    } catch (err) {

      console.error(err);

      alert("Erro inesperado ao enviar briefing.");

    }

  });

}

  /* ==========================================
   LOGIN
  ========================================== */

  const loginForm = document.getElementById(
  "loginForm"
  );

  if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const emailInput =
        document.getElementById(
          "loginEmail"
        );

      const passwordInput =
        document.getElementById(
          "loginPassword"
        );

      const email = emailInput
        ? emailInput.value.trim()
        : "";

      const password = passwordInput
        ? passwordInput.value.trim()
        : "";

      if (!email || !password) {

        alert(
          "Preencha email e senha."
        );

        return;

      }

      if (
        typeof supabaseClient ===
        "undefined"
      ) {

        alert(
          "Erro: Supabase não carregou. Verifique o config.js."
        );

        return;

      }

      try {

        const { error } =
          await supabaseClient.auth.signInWithPassword({
            email,
            password
          });

        if (error) {

          alert(error.message);

          return;

        }

        const {
          data: { session }
        } = await supabaseClient.auth.getSession();

        const {
          data: profile,
          error: profileError
        } = await supabaseClient
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profileError || !profile) {

          alert(
            "Login realizado, mas perfil não encontrado."
          );

          window.location.href =
            "dashboard.html";

          return;

        }

        if (profile.role === "admin") {

          window.location.href =
            "admin.html";

        } else {

          window.location.href =
            "dashboard.html";

        }

      } catch (err) {

        console.error(err);

        alert(
          "Erro ao iniciar sessão."
        );

      }

    }
  );

}
});

/* ==========================================
   ADMIN PAINEL - NAVEGAÇÃO E BOTÕES
========================================== */

const menuLinks = document.querySelectorAll(".menu a[data-section]");
const panelTitle = document.querySelector(".panel-header h2");
const tableBody = document.querySelector("tbody");
const novoProjetoBtn = document.getElementById("novoProjetoBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* ==========================================
   ADMIN - BRIEFINGS REAIS
========================================== */

async function carregarAdminReal() {

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

    const tr =
      document.createElement("tr");

    tr.innerHTML = `

      <td>
        ${briefing.nome || "Sem nome"}
      </td>

      <td>
        ${briefing.empresa || "Não informado"}
      </td>

      <td>
        ${briefing.tipo_projeto || "Projeto"}
      </td>

      <td>
        <span class="status recebido">
          ${briefing.status || "Recebido"}
        </span>
      </td>

      <td class="acoes">

  <button
    class="verBtn"
    data-id="${briefing.id}"
  >
    Ver
  </button>

  <button
    class="editarBtn"
    data-id="${briefing.id}"
  >
    Editar
  </button>

  <button
    class="excluirBtn"
    data-id="${briefing.id}"
  >
    Excluir
  </button>

</td>

    `;

    tableBody.appendChild(tr);

  });

  ativarAcoesAdmin();

}

/* ==========================================
   BOTÕES ADMIN
========================================== */

function ativarAcoesAdmin() {

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

/* ==========================================
   INICIAR ADMIN
========================================== */

if (
  window.location.pathname.includes(
    "admin.html"
  )
) {

  carregarAdminReal();

}

/* ==========================================
   ADMIN - MENU REAL
========================================== */

const adminMenuLinks =
  document.querySelectorAll(".menu a[data-section]");

adminMenuLinks.forEach((link) => {

  link.addEventListener("click", async (event) => {

    event.preventDefault();

    adminMenuLinks.forEach((item) => {
      item.classList.remove("active");
    });

    link.classList.add("active");

    const secao = link.dataset.section;

    if (secao === "dashboard" || secao === "briefings") {
      carregarAdminReal();
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

/* ==========================================
   ADMIN - VOUCHERS REAIS
========================================== */

async function carregarAdminVouchers() {

  const tableBody =
    document.querySelector("tbody");

  const panelTitle =
    document.querySelector(".panel-header h2");

  if (!tableBody) return;

  if (panelTitle) {
    panelTitle.textContent = "Vouchers";
  }

  const { data, error } =
    await supabaseClient
      .from("vouchers")
      .select("*")
      .order("criado_em", {
        ascending: false
      });

  if (error) {
    console.error(error);

    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          Erro ao carregar vouchers.
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
          Nenhum voucher encontrado.
        </td>
      </tr>
    `;

    return;
  }

  data.forEach((voucher) => {

    const tr =
      document.createElement("tr");

    tr.innerHTML = `
      <td>${voucher.codigo}</td>
      <td>Limite: ${voucher.limite_uso}</td>
      <td>Usos: ${voucher.usos}</td>
      <td>
        <span class="status ${voucher.ativo ? "recebido" : "finalizado"}">
          ${voucher.ativo ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td class="acoes">
        <button
          class="toggleVoucherBtn"
          data-id="${voucher.id}"
          data-ativo="${voucher.ativo}"
        >
          ${voucher.ativo ? "Desativar" : "Reativar"}
        </button>
      </td>
    `;

    tableBody.appendChild(tr);

  });

  ativarBotoesVoucherAdmin();

}

function ativarBotoesVoucherAdmin() {

  document
    .querySelectorAll(".toggleVoucherBtn")
    .forEach((btn) => {

      btn.addEventListener("click", async () => {

        const id = btn.dataset.id;
        const ativoAtual = btn.dataset.ativo === "true";

        const { error } =
          await supabaseClient
            .from("vouchers")
            .update({
              ativo: !ativoAtual
            })
            .eq("id", id);

        if (error) {
          console.error(error);
          alert("Erro ao atualizar voucher.");
          return;
        }

        carregarAdminVouchers();

      });

    });

}

/* ==========================================
   ADMIN - SEÇÕES EM BREVE
========================================== */

function mostrarSecaoEmBreve(secao) {

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

/* ==========================================
   ADMIN - CARDS REAIS
========================================== */

async function carregarCardsAdmin() {

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
      vouchers?.filter(
        (item) => item.ativo
      ).length || 0;
  }

  if (totalClientes) {
    const clientesUnicos =
      new Set(
        briefings?.map((item) => item.email)
      );

    totalClientes.textContent =
      clientesUnicos.size || 0;
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

carregarCardsAdmin();

/* ==========================================
   ADMIN - FECHAR MODAL BRIEFING
========================================== */

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

/* ==========================================
   ADMIN - MODAL EDITAR STATUS
========================================== */

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

if (salvarEditStatusBtn) {

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

      mostrarToast(
        "Erro ao atualizar status.",
        "error"
      );

      return;
    }

    adminEditModal.classList.remove("active");

    mostrarToast(
      "Status atualizado com sucesso!",
      "success"
    );

    carregarAdminReal();
    carregarCardsAdmin();

  });

}

/* ==========================================
   ADMIN - BUSCA E FILTROS
========================================== */

const adminSearch =
  document.getElementById("adminSearch");

const adminStatusFilter =
  document.getElementById("adminStatusFilter");

function aplicarFiltrosAdmin() {

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
      !statusFiltro ||
      status === statusFiltro;

    linha.style.display =
      correspondeBusca &&
      correspondeStatus
        ? ""
        : "none";

  });

}

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

/* ==========================================
   TOASTS PREMIUM
========================================== */

function mostrarToast(
  mensagem,
  tipo = "info"
) {

  const toastContainer =
    document.getElementById("toastContainer");

  if (!toastContainer) return;

  const toast =
    document.createElement("div");

  toast.classList.add("toast", tipo);

  toast.textContent = mensagem;

  toastContainer.appendChild(toast);

  setTimeout(() => {

    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";

    setTimeout(() => {
      toast.remove();
    }, 300);

  }, 3000);

}

/* ==========================================
   REALTIME ADMIN
========================================== */

if (
  window.location.pathname.includes(
    "admin.html"
  )
) {

  supabaseClient
    .channel("admin-realtime")

    /* BRIEFINGS */
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "briefings"
      },
      () => {

        carregarAdminReal();
        carregarCardsAdmin();

      }
    )

    /* VOUCHERS */
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "vouchers"
      },
      () => {

        carregarVouchers();
        carregarCardsAdmin();

      }
    )

    .subscribe();

}

/* ==========================================
   CLIENTE - UPLOAD DE ARQUIVOS
========================================== */

const clienteUploadInput =
  document.getElementById("clienteUploadInput");

const clienteUploadsTable =
  document.getElementById("clienteUploadsTable");

if (clienteUploadInput) {

  clienteUploadInput.addEventListener("change", async () => {

    const arquivos =
      Array.from(clienteUploadInput.files);

    if (arquivos.length === 0) return;

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
      window.location.href = "login.html";
      return;
    }

    for (const arquivo of arquivos) {

      const caminho =
        `${session.user.id}/${Date.now()}-${arquivo.name}`;

      const { error } =
        await supabaseClient.storage
          .from("project-files")
          .upload(caminho, arquivo);

      if (error) {
        console.error(error);

        mostrarToast(
          `Erro ao enviar ${arquivo.name}`,
          "error"
        );

        continue;
      }
      await supabaseClient
        .from("project_uploads")
        .insert([{
        user_id: session.user.id,
        email: session.user.email,
        nome_arquivo: arquivo.name,
        caminho: caminho,
        tipo: arquivo.type
  }]);

      mostrarToast(
        `${arquivo.name} enviado com sucesso!`,
        "success"
      );

    }

    clienteUploadInput.value = "";

    carregarUploadsCliente();

  });

}

async function carregarUploadsCliente() {

  if (!clienteUploadsTable) return;

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) return;

  const { data, error } =
    await supabaseClient.storage
      .from("project-files")
      .list(session.user.id, {
        limit: 50,
        sortBy: {
          column: "created_at",
          order: "desc"
        }
      });

  if (error) {
    console.error(error);
    return;
  }

  clienteUploadsTable.innerHTML = "";

  if (!data || data.length === 0) {
    clienteUploadsTable.innerHTML = `
      <tr>
        <td colspan="4">
          Nenhum arquivo enviado ainda.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach((arquivo) => {

    const tr =
      document.createElement("tr");

    const filePath =
      `${session.user.id}/${arquivo.name}`;

    tr.innerHTML = `

      <td>
        ${arquivo.name}
      </td>

      <td>
        ${arquivo.metadata?.mimetype || "Arquivo"}
      </td>

      <td>
        ${new Date(
          arquivo.created_at
        ).toLocaleDateString("pt-PT")}
      </td>

      <td>

        <button
          class="upload-action-btn visualizarArquivoBtn"
          data-path="${filePath}"
        >
          Ver
        </button>

        <button
          class="upload-action-btn baixarArquivoBtn"
          data-path="${filePath}"
          data-name="${arquivo.name}"
        >
          Download
        </button>

      </td>

    `;

    clienteUploadsTable.appendChild(tr);

    /* VISUALIZAR */
    const visualizarBtn =
      tr.querySelector(".visualizarArquivoBtn");

    if (visualizarBtn) {

      visualizarBtn.addEventListener("click", async () => {

        const path =
          visualizarBtn.dataset.path;

        const { data, error } =
          await supabaseClient.storage
            .from("project-files")
            .createSignedUrl(path, 120);

        if (error) {
          console.error(error);

          mostrarToast(
            "Erro ao abrir arquivo.",
            "error"
          );

          return;
        }

        abrirPreviewArquivo(
          arquivo.name,
          arquivo.metadata?.mimetype,
          data.signedUrl);

      });

    }

    /* DOWNLOAD */
    const baixarBtn =
      tr.querySelector(".baixarArquivoBtn");

    if (baixarBtn) {

      baixarBtn.addEventListener("click", async () => {

        const path =
          baixarBtn.dataset.path;

        const nome =
          baixarBtn.dataset.name;

        const { data, error } =
          await supabaseClient.storage
            .from("project-files")
            .download(path);

        if (error) {
          console.error(error);

          mostrarToast(
            "Erro ao baixar arquivo.",
            "error"
          );

          return;
        }

        const url =
          URL.createObjectURL(data);

        const link =
          document.createElement("a");

        link.href = url;
        link.download = nome;

        document.body.appendChild(link);
        link.click();

        link.remove();

        URL.revokeObjectURL(url);

      });

    }

  });

}

carregarUploadsCliente();

/* ==========================================
   CLIENTE - PREVIEW DE ARQUIVO EM MODAL
========================================== */

function abrirPreviewArquivo(nome, tipo, url) {

  const modal =
    document.getElementById("filePreviewModal");

  const title =
    document.getElementById("filePreviewTitle");

  const area =
    document.getElementById("filePreviewArea");

  if (!modal || !title || !area) return;

  title.textContent = nome;

  area.innerHTML = "";

  if (tipo && tipo.startsWith("image/")) {

    area.innerHTML = `
      <img src="${url}" alt="${nome}">
    `;

  } else if (tipo === "application/pdf") {

    area.innerHTML = `
      <iframe src="${url}"></iframe>
    `;

  } else {

    area.innerHTML = `
      <p>
        Pré-visualização indisponível para este tipo de arquivo.
        Use o botão Download.
      </p>
    `;

  }

  modal.classList.add("active");

}

const filePreviewModal =
  document.getElementById("filePreviewModal");

const closeFilePreviewModal =
  document.getElementById("closeFilePreviewModal");

if (filePreviewModal && closeFilePreviewModal) {

  closeFilePreviewModal.addEventListener("click", () => {
    filePreviewModal.classList.remove("active");
  });

  filePreviewModal.addEventListener("click", (event) => {
    if (event.target === filePreviewModal) {
      filePreviewModal.classList.remove("active");
    }
  });

}

/* ==========================================
   ADMIN - UPLOADS DOS CLIENTES
========================================== */

async function carregarAdminUploads() {

  const tableBody =
    document.querySelector("tbody");

  const panelTitle =
    document.querySelector(".panel-header h2");

  if (!tableBody) return;

  if (panelTitle) {
    panelTitle.textContent = "Uploads dos Clientes";
  }

  const { data, error } =
    await supabaseClient
      .from("project_uploads")
      .select("*")
      .order("criado_em", {
        ascending: false
      });

  if (error) {
    console.error(error);

    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          Erro ao carregar uploads.
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
          Nenhum upload encontrado.
        </td>
      </tr>
    `;

    return;
  }

  data.forEach((upload) => {

    const tr =
      document.createElement("tr");

    tr.innerHTML = `
      <td>${upload.nome_arquivo}</td>
      <td>${upload.email || "Cliente"}</td>
      <td>${upload.tipo || "Arquivo"}</td>
      <td>
        <span class="status recebido">
          Recebido
        </span>
      </td>
      <td class="acoes">
        <button
          class="adminVerUploadBtn"
          data-path="${upload.caminho}"
          data-name="${upload.nome_arquivo}"
          data-type="${upload.tipo}"
        >
          Ver
        </button>

        <button
          class="adminBaixarUploadBtn"
          data-path="${upload.caminho}"
          data-name="${upload.nome_arquivo}"
        >
          Download
        </button>
      </td>
    `;

    tableBody.appendChild(tr);

  });

  ativarBotoesAdminUploads();

}

function ativarBotoesAdminUploads() {

  document
    .querySelectorAll(".adminVerUploadBtn")
    .forEach((btn) => {

      btn.addEventListener("click", async () => {

        const path = btn.dataset.path;

        const { data, error } =
          await supabaseClient.storage
            .from("project-files")
            .createSignedUrl(path, 120);

        if (error) {
          console.error(error);
          mostrarToast("Erro ao abrir arquivo.", "error");
          return;
        }

        abrirPreviewArquivo(
          btn.dataset.name,
          btn.dataset.type,
          data.signedUrl
        );

      });

    });

  document
    .querySelectorAll(".adminBaixarUploadBtn")
    .forEach((btn) => {

      btn.addEventListener("click", async () => {

        const path = btn.dataset.path;
        const nome = btn.dataset.name;

        const { data, error } =
          await supabaseClient.storage
            .from("project-files")
            .download(path);

        if (error) {
          console.error(error);
          mostrarToast("Erro ao baixar arquivo.", "error");
          return;
        }

        const url = URL.createObjectURL(data);

        const link = document.createElement("a");
        link.href = url;
        link.download = nome;

        document.body.appendChild(link);
        link.click();

        link.remove();
        URL.revokeObjectURL(url);

      });

    });

}

/* ==========================================
   COMENTÁRIOS DO PROJETO
========================================== */

const projectComments =
  document.getElementById("projectComments");

const commentForm =
  document.getElementById("commentForm");

const commentInput =
  document.getElementById("commentInput");

async function carregarComentariosProjeto() {

  if (!projectComments) return;

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!briefings || briefings.length === 0) {

  mostrarToast(
    "Nenhum briefing encontrado para este usuário.",
    "error"
  );

  console.warn(
    "Nenhum briefing encontrado para o email:",
    session.user.email
  );

  return;

}

  const { data: briefings } =
    await supabaseClient
      .from("briefings")
      .select("id")
      .eq("email", session.user.email)
      .limit(1);

  if (!briefings || briefings.length === 0) return;

  const briefingId =
    briefings[0].id;

  const { data, error } =
    await supabaseClient
      .from("project_comments")
      .select("*")
      .eq("briefing_id", briefingId)
      .order("criado_em", {
        ascending: true
      });

  if (error) {
    console.error(error);
    return;
  }

  projectComments.innerHTML = "";

  if (!data || data.length === 0) {

    projectComments.innerHTML = `
      <p>Nenhum comentário ainda.</p>
    `;

    return;

  }

  data.forEach((comentario) => {

    const div =
      document.createElement("div");

    div.classList.add("comment-item");

    div.innerHTML = `
      <strong>
        ${comentario.user_nome}
      </strong>

      <p>
        ${comentario.mensagem}
      </p>

      <span>
        ${new Date(
          comentario.criado_em
        ).toLocaleString("pt-PT")}
      </span>
    `;

    projectComments.appendChild(div);

  });

}

if (commentForm) {

  commentForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const mensagem =
      commentInput.value.trim();

    if (!mensagem) return;

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) return;

    const { data: briefings } =
      await supabaseClient
        .from("briefings")
        .select("id,nome")
        .eq("email", session.user.email)
        .limit(1);

    if (!briefings || briefings.length === 0) {

  mostrarToast(
    "Nenhum briefing encontrado para este usuário.",
    "error"
  );

  console.warn(
    "Nenhum briefing encontrado para o email:",
    session.user.email
  );

  return;

}

const briefing =
  briefings[0];

    const { data: comentarioSalvo, error } =
  await supabaseClient
    .from("project_comments")
    .insert([{

      briefing_id:
        briefing.id,

      user_id:
        session.user.id,

      user_nome:
        briefing.nome || session.user.email,

      mensagem

    }])
    .select();

console.log(
  "Comentário cliente salvo:",
  comentarioSalvo
);

      if (error) {
      console.error(error);

      mostrarToast(
        "Erro ao enviar comentário.",
        "error"
      );

      return;
    }

    commentInput.value = "";

    mostrarToast(
      "Comentário enviado!",
      "success"
    );

    carregarComentariosProjeto();

  });

}

carregarComentariosProjeto();

/* ==========================================
   CLIENTE - PREVIEW DE ARQUIVO EM MODAL
========================================== */

function abrirPreviewArquivo(nome, tipo, url) {

  const modal =
    document.getElementById("filePreviewModal");

  const title =
    document.getElementById("filePreviewTitle");

  const area =
    document.getElementById("filePreviewArea");

  if (!modal || !title || !area) return;

  title.textContent = nome;

  area.innerHTML = "";

  if (tipo && tipo.startsWith("image/")) {

    area.innerHTML = `
      <img src="${url}" alt="${nome}">
    `;

  } else if (tipo === "application/pdf") {

    area.innerHTML = `
      <iframe src="${url}"></iframe>
    `;

  } else {

    area.innerHTML = `
      <p>
        Pré-visualização indisponível para este tipo de arquivo.
        Use o botão Download.
      </p>
    `;

  }

  modal.classList.add("active");

}

async function carregarComentariosAdmin(briefingId) {

  console.log("Briefing aberto:", briefingId);

  adminBriefingComentarioId = briefingId;

  const adminProjectComments =
    document.getElementById("adminProjectComments");

  if (!adminProjectComments) return;

  const { data, error } =
    await supabaseClient
      .from("project_comments")
      .select("*")
      .eq("briefing_id", briefingId)
      .order("criado_em", {
        ascending: true
      });

  console.log("Comentários:", data);
  console.log("Erro comentários:", error);

  if (error) {
    console.error(error);
    return;
  }

  adminProjectComments.innerHTML = "";

  if (!data || data.length === 0) {
    adminProjectComments.innerHTML = `
      <p>Nenhum comentário ainda.</p>
    `;
    return;
  }

  data.forEach((comentario) => {

    const div =
      document.createElement("div");

    div.classList.add("comment-item");

    div.innerHTML = `
      <strong>
        ${comentario.user_nome || "Cliente"}
      </strong>

      <p>
        ${comentario.mensagem}
      </p>

      <span>
        ${new Date(
          comentario.criado_em
        ).toLocaleString("pt-PT")}
      </span>
    `;

    adminProjectComments.appendChild(div);

  });

}

const adminCommentForm =
  document.getElementById("adminCommentForm");

const adminCommentInput =
  document.getElementById("adminCommentInput");

if (adminCommentForm) {

  adminCommentForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const mensagem =
      adminCommentInput.value.trim();

    if (!mensagem || !adminBriefingComentarioId) return;

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) return;

    const { error } =
      await supabaseClient
        .from("project_comments")
        .insert([{
          briefing_id: adminBriefingComentarioId,
          user_id: session.user.id,
          user_nome: "Admin DOZEDEV",
          mensagem
        }]);

    if (error) {
      console.error(error);

      mostrarToast(
        "Erro ao enviar resposta.",
        "error"
      );

      return;
    }

    const { data: briefingCliente } =
      await supabaseClient
        .from("briefings")
        .select("email")
        .eq("id", adminBriefingComentarioId)
        .single();

    if (briefingCliente?.email) {

      const { data: userCliente } =
        await supabaseClient
          .from("profiles")
          .select("id")
          .eq("email", briefingCliente.email)
          .single();

      if (userCliente) {

        await supabaseClient
          .from("notifications")
          .insert([{
            user_id: userCliente.id,
            titulo: "Nova resposta da DOZEDEV",
            mensagem: "O administrador respondeu ao seu projeto."
          }]);

      }

    }

    adminCommentInput.value = "";

    mostrarToast(
      "Resposta enviada!",
      "success"
    );

    carregarComentariosAdmin(
      adminBriefingComentarioId
    );

  });

}

/* ==========================================
   REALTIME CLIENTE - NOTIFICAÇÕES
========================================== */

async function iniciarRealtimeCliente() {

  if (
    !window.location.pathname.includes(
      "dashboard.html"
    )
  ) {
    return;
  }

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) return;

  supabaseClient
    .channel("cliente-notificacoes")

    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${session.user.id}`
      },
      () => {

        carregarNotificacoes();

        mostrarToast(
          "Nova notificação recebida!",
          "info"
        );

      }
    )

    .subscribe();

}

iniciarRealtimeCliente();

/* ==========================================
   TIMELINE DO PROJETO
========================================== */

const projectTimeline =
  document.getElementById("projectTimeline");

async function carregarTimelineProjeto() {

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

  const briefing =
    briefings[0];

  const statusAtual =
    briefing.status || "Recebido";

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

carregarTimelineProjeto();

/* ==========================================
   PROGRESSO DO PROJETO
========================================== */

async function carregarProgressoProjeto() {

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
    "Revisão": 85,
    "Finalizado": 100
  };

  const progresso =
    progressoPorStatus[status] || 15;

  progressoTexto.textContent =
    `${progresso}%`;

  progressoFill.style.width =
    `${progresso}%`;

}

carregarProgressoProjeto();

/* ==========================================
   SIDEBAR USER INFO
========================================== */

async function carregarSidebarUser() {

  const userName =
    document.getElementById("sidebarUserName");

  const userAvatar =
    document.getElementById("sidebarAvatar");

  if (!userName || !userAvatar) return;

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) return;

  const { data } =
    await supabaseClient
      .from("briefings")
      .select("nome")
      .eq("email", session.user.email)
      .limit(1)
      .single();

  if (!data) return;

  userName.textContent =
    data.nome;

  userAvatar.textContent =
    data.nome.charAt(0).toUpperCase();

}

carregarSidebarUser();