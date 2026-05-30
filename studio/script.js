document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================
     BRIEFING / VOUCHER
  ========================================== */

  const tipoProjetoInputs = document.querySelectorAll('input[name="tipoProjeto"]');

  const voucherModal = document.getElementById("voucherModal");
  const closeVoucherModal = document.getElementById("closeVoucherModal");
  const acceptVoucherRules = document.getElementById("acceptVoucherRules");
  const cancelVoucherRules = document.getElementById("cancelVoucherRules");

  const voucherCodeGroup = document.getElementById("voucherCodeGroup");
  const voucherCode = document.getElementById("voucherCode");
  const voucherAlert = document.getElementById("voucherAlert");

  const quantidadePaginas = document.getElementById("quantidadePaginas");
  const prazoDesejado = document.getElementById("prazoDesejado");
  const funcionalidades = document.querySelectorAll(".funcionalidade");

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

  function ativarVoucher() {
    abrirModalVoucher();

    if (voucherCodeGroup) {
      voucherCodeGroup.style.display = "flex";
    }

    if (voucherCode) {
      voucherCode.setAttribute("required", "required");
      voucherCode.placeholder = "Ex: CLAIM-DOZE-001";
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
      if (item.classList.contains("voucher-func")) {
        item.checked = true;
        item.disabled = false;
      } else {
        item.checked = false;
        item.disabled = true;
      }
    });
  }

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

  tipoProjetoInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.value === "voucher" && input.checked) {
        ativarVoucher();
      }

      if (input.value === "normal" && input.checked) {
        desativarVoucher();
      }
    });
  });

  if (closeVoucherModal) {
    closeVoucherModal.addEventListener("click", () => {
      fecharModalVoucher();
    });
  }

  if (acceptVoucherRules) {
    acceptVoucherRules.addEventListener("click", () => {
      fecharModalVoucher();

      if (voucherCode) {
        voucherCode.focus();
      }
    });
  }

  if (cancelVoucherRules) {
    cancelVoucherRules.addEventListener("click", () => {
      desativarVoucher();
    });
  }

  if (voucherModal) {
    voucherModal.addEventListener("click", (event) => {
      if (event.target === voucherModal) {
        fecharModalVoucher();
      }
    });
  }

  /* ==========================================
     FORMULÁRIO BRIEFING
  ========================================== */

  const briefingForm = document.getElementById("briefingForm");

  if (briefingForm) {
    briefingForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (voucherCode && voucherCode.hasAttribute("required")) {
        if (voucherCode.value.trim() === "") {
          alert("Digite o número do voucher.");
          voucherCode.focus();
          return;
        }
      }

      alert("Briefing enviado com sucesso! Depois vamos ligar isso ao Supabase.");
    });
  }

  /* ==========================================
     LOGIN
  ========================================== */

  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const emailInput = document.getElementById("loginEmail");
      const passwordInput = document.getElementById("loginPassword");

      const email = emailInput ? emailInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value.trim() : "";

      if (!email || !password) {
        alert("Preencha email e senha.");
        return;
      }

      alert("Login visual funcionando. Depois vamos ligar ao Supabase.");

      window.location.href = "dashboard.html";
    });
  }
});