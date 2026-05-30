document.addEventListener("DOMContentLoaded", () => {

  /* ==========================================
   PROTEGER PÁGINAS PRIVADAS
========================================== */

async function protegerPaginasPrivadas() {
  const paginasPrivadas = [
    "dashboard.html",
    "admin.html",
    "briefing.html"
  ];

  const paginaAtual = window.location.pathname.split("/").pop();

  if (!paginasPrivadas.includes(paginaAtual)) {
    return;
  }

  if (typeof supabaseClient === "undefined") {
    alert("Erro: Supabase não carregou.");
    window.location.href = "login.html";
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data.session) {
    alert("Faça login para acessar o DOZEDEV Studio.");
    window.location.href = "login.html";
  }
}

protegerPaginasPrivadas();

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
     FORMULÁRIO BRIEFING
  ========================================== */

  const briefingForm = document.getElementById(
    "briefingForm"
  );

  if (briefingForm) {

    briefingForm.addEventListener(
      "submit",
      (event) => {

        event.preventDefault();

        if (
          voucherCode &&
          voucherCode.hasAttribute("required")
        ) {

          if (
            voucherCode.value.trim() === ""
          ) {

            alert(
              "Digite o número do voucher."
            );

            voucherCode.focus();

            return;

          }

        }

        alert(
          "Briefing enviado com sucesso! Depois vamos ligar isso ao Supabase."
        );

      }
    );

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

          const { data, error } =
            await supabaseClient.auth.signInWithPassword({
              email,
              password
            });

          if (error) {

            alert(error.message);

            return;

          }

          alert(
            "Login realizado com sucesso!"
          );

          window.location.href =
            "dashboard.html";

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
   PROTEGER PÁGINAS PRIVADAS
========================================== */

async function protegerPagina() {
  const paginasPrivadas = [
    "dashboard.html",
    "admin.html",
    "briefing.html"
  ];

  const paginaAtual = window.location.pathname.split("/").pop();

  if (!paginasPrivadas.includes(paginaAtual)) {
    return;
  }

  if (typeof supabaseClient === "undefined") {
    alert("Supabase não carregou.");
    window.location.href = "login.html";
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data.session) {
    alert("Faça login para acessar o DOZEDEV Studio.");
    window.location.href = "login.html";
  }
}

protegerPagina();