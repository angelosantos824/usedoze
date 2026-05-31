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
   DASHBOARD - LISTAR BRIEFINGS
========================================== */

async function carregarDashboard() {

  const briefingsContainer =
    document.getElementById("briefingsContainer");

  if (!briefingsContainer) return;

  try {

    const { data, error } = await supabaseClient
      .from("briefings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    /* CARDS SUPERIORES */

    document.getElementById("totalBriefings").textContent =
      data.length;

    document.getElementById("novosProjetos").textContent =
      data.filter(item => item.status === "Novo").length;

    document.getElementById("totalVouchers").textContent =
      data.filter(item => item.tipo_projeto === "voucher").length;

    /* LISTA */

    briefingsContainer.innerHTML = "";

    data.forEach((briefing) => {

      const card = document.createElement("article");

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
          <strong>Email:</strong>
          ${briefing.email || "Não informado"}
        </p>

        <p>
          <strong>Projeto:</strong>
          ${briefing.tipo_projeto || "normal"}
        </p>

        <p>
          <strong>Status:</strong>
          ${briefing.status || "Novo"}
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

  } catch (err) {

    console.error(err);

  }

}

carregarDashboard();

function abrirModalBriefing(briefing) {

  const modal = document.getElementById("briefingModal");

  if (!modal) return;

  briefingAtualId = briefing.id;

  const modalStatusSelect =
    document.getElementById("modalStatusSelect");

  if (modalStatusSelect) {
    modalStatusSelect.value =
      briefing.status || "Novo";
  }

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
    briefing.status || "Novo";

  document.getElementById("modalDescricao").textContent =
    briefing.descricao || "Sem descrição.";

  document.getElementById("modalFuncionalidades").textContent =
    briefing.funcionalidades?.join(", ") || "Não informado";

  modal.classList.add("active");

}

const closeBriefingModal = document.getElementById("closeBriefingModal");
const briefingModal = document.getElementById("briefingModal");

if (closeBriefingModal && briefingModal) {
  closeBriefingModal.addEventListener("click", () => {
    briefingModal.classList.remove("active");
  });

  briefingModal.addEventListener("click", (event) => {
    if (event.target === briefingModal) {
      briefingModal.classList.remove("active");
    }
  });
  }

const salvarStatusBtn = document.getElementById("salvarStatusBtn");

if (salvarStatusBtn) {
  salvarStatusBtn.addEventListener("click", async () => {
    const modalStatusSelect = document.getElementById("modalStatusSelect");

    if (!briefingAtualId || !modalStatusSelect) {
      alert("Nenhum briefing selecionado.");
      return;
    }

    const novoStatus = modalStatusSelect.value;

    const { error } = await supabaseClient
      .from("briefings")
      .update({ status: novoStatus })
      .eq("id", briefingAtualId);

    if (error) {
      console.error(error);
      alert("Erro ao atualizar status.");
      return;
    }

    document.getElementById("modalStatus").textContent = novoStatus;

    alert("Status atualizado com sucesso!");
    location.reload();
  });
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

    if (voucherCodeGroup) {
      voucherCodeGroup.style.display = "flex";
    }

    if (voucherCode) {

      voucherCode.setAttribute(
        "required",
        "required"
      );

      voucherCode.placeholder =
        "Ex: CLAIM-DOZE-001";

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

      alert("Briefing enviado com sucesso!");

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
