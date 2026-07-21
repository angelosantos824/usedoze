import { mostrarToast } from "./notifications.js";
import { FEATURES } from "./features.js";
import { paginaAtual } from "./utils.js";

let turnstileToken = null;
let turnstileWidgetId = null;
let turnstileRenderTimer = null;
let turnstileRenderAttempts = 0;

function getTurnstileSiteKey() {
  return globalThis.DOZEDEV_CONFIG?.turnstileSiteKey || "";
}

function resetTurnstile() {
  turnstileRenderAttempts = 0;

  if (turnstileRenderTimer) {
    clearTimeout(turnstileRenderTimer);
    turnstileRenderTimer = null;
  }

  if (globalThis.turnstile?.remove && turnstileWidgetId !== null) {
    try {
      globalThis.turnstile.remove(turnstileWidgetId);
    } catch (error) {
      console.error("DOZEDEV_STUDIO_ERROR", {
        modulo: "auth",
        acao: "turnstile_remove",
        mensagem: error?.message || "Falha ao remover Turnstile.",
        details: error
      });
    }
  }

  turnstileWidgetId = null;
  turnstileToken = null;
}

function scheduleTurnstileRender() {
  if (!FEATURES.clientFoundationV2) return;

  if (turnstileRenderTimer) {
    clearTimeout(turnstileRenderTimer);
  }

  requestAnimationFrame(() => {
    turnstileRenderTimer = setTimeout(renderTurnstile, 50);
  });
}

function renderTurnstile() {
  const container = document.getElementById("turnstileContainer");

  if (!FEATURES.clientFoundationV2 || !container) return;
  if (turnstileWidgetId !== null) return;

  const siteKey = getTurnstileSiteKey();
  if (!siteKey) {
    console.error("DOZEDEV_STUDIO_ERROR", {
      modulo: "auth",
      acao: "turnstile_config",
      mensagem: "Turnstile site key publica nao configurada."
    });
    return;
  }

  if (!globalThis.turnstile?.render) {
    if (turnstileRenderAttempts < 30) {
      turnstileRenderAttempts += 1;
      turnstileRenderTimer = setTimeout(renderTurnstile, 250);
    } else {
      console.error("DOZEDEV_STUDIO_ERROR", {
        modulo: "auth",
        acao: "turnstile_script",
        mensagem: "Turnstile nao ficou disponivel para renderizacao."
      });
    }
    return;
  }

  if (
    typeof globalThis.onTurnstileSuccess !== "function" ||
    typeof globalThis.onTurnstileExpired !== "function" ||
    typeof globalThis.onTurnstileError !== "function"
  ) {
    console.error("DOZEDEV_STUDIO_ERROR", {
      modulo: "auth",
      acao: "turnstile_callbacks",
      mensagem: "Callbacks do Turnstile nao estao definidos como funcoes."
    });
    return;
  }

  try {
    turnstileWidgetId = globalThis.turnstile.render(container, {
      sitekey: siteKey,
      callback: globalThis.onTurnstileSuccess,
      "expired-callback": globalThis.onTurnstileExpired,
      "error-callback": globalThis.onTurnstileError
    });
    turnstileRenderAttempts = 0;
  } catch (error) {
    console.error("DOZEDEV_STUDIO_ERROR", {
      modulo: "auth",
      acao: "turnstile_render",
      mensagem: error?.message || "Falha ao renderizar Turnstile.",
      details: error
    });
  }
}

globalThis.onTurnstileSuccess = function (token) {
  turnstileToken = token;
};

globalThis.onTurnstileExpired = function () {
  turnstileToken = null;
  mostrarToast("A verificacao de seguranca expirou. Confirme novamente.", "warning");
};

globalThis.onTurnstileError = function () {
  turnstileToken = null;
  mostrarToast("Nao foi possivel validar a protecao de seguranca.", "error");
};

export async function protegerPaginasPrivadas() {
  const paginasPrivadas = [
    "dashboard.html",
    "admin.html",
    "briefing.html"
  ];

  if (!paginasPrivadas.includes(paginaAtual())) return;

  if (typeof supabaseClient === "undefined") {
    alert("Erro: Supabase não carregou.");
    window.location.href = "login.html";
    return;
  }

  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error || !session) {
    alert("Faça login para acessar o DOZEDEV Studio.");
    window.location.href = "login.html";
  }
}

export async function protegerAdmin() {
  if (paginaAtual() !== "admin.html") return;

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
    alert("Acesso permitido apenas para administradores.");
    window.location.href = "dashboard.html";
  }
}

function initLogout() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) return;

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

function initLogin() {
  const loginForm = document.getElementById("loginForm");

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!email || !password) {
      alert("Preencha email e senha.");
      return;
    }

    if (typeof supabaseClient === "undefined") {
      alert("Erro: Supabase não carregou. Verifique o config.js.");
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
        alert("Login realizado, mas perfil não encontrado.");
        window.location.href = "dashboard.html";
        return;
      }

      window.location.href =
        profile.role === "admin"
          ? "admin.html"
          : "dashboard.html";
    } catch (err) {
      console.error(err);
      alert("Erro ao iniciar sessão.");
    }
  });
}

function initResendConfirmation() {
  const resendConfirmationBtn =
    document.getElementById("resendConfirmationBtn");
  const loginEmail =
    document.getElementById("loginEmail");

  if (!resendConfirmationBtn || !loginEmail) return;

  resendConfirmationBtn.addEventListener("click", async () => {
    const email = loginEmail.value.trim();

    if (!email) {
      mostrarToast("Informe o email para reenviar a confirmacao.", "warning");
      return;
    }

    resendConfirmationBtn.disabled = true;
    resendConfirmationBtn.textContent = "A reenviar...";

    try {
      await supabaseClient.functions.invoke(
        "resend-studio-confirmation",
        {
          body: { email }
        }
      );
    } catch (error) {
      console.error("DOZEDEV_STUDIO_ERROR", {
        modulo: "auth",
        acao: "resend_confirmation",
        mensagem: error?.message || "Erro inesperado",
        details: error
      });
    } finally {
      mostrarToast(
        "Se existir uma conta pendente para este email, enviaremos uma nova confirmacao.",
        "info"
      );
      resendConfirmationBtn.disabled = false;
      resendConfirmationBtn.textContent = "Reenviar email de confirmacao";
    }
  });
}

function initRegister() {
  const registerModal =
    document.getElementById("registerModal");
  const openRegisterModal =
    document.getElementById("openRegisterModal");
  const closeRegisterModal =
    document.getElementById("closeRegisterModal");
  const registerForm =
    document.getElementById("registerForm");

  if (
    registerModal &&
    openRegisterModal &&
    closeRegisterModal
  ) {
    openRegisterModal.addEventListener("click", () => {
      registerModal.classList.add("active");
      scheduleTurnstileRender();
    });

    closeRegisterModal.addEventListener("click", () => {
      registerModal.classList.remove("active");
      resetTurnstile();
    });
  }

  if (!registerForm) return;
  if (registerModal?.classList.contains("active")) {
    scheduleTurnstileRender();
  }

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = registerForm.querySelector("button[type='submit']");
    if (submit?.disabled) return;

    const nome =
      document.getElementById("registerName").value.trim();
    const email =
      document.getElementById("registerEmail").value.trim();
    const password =
      document.getElementById("registerPassword").value.trim();

    if (!nome || !email || !password) return;

    if (FEATURES.clientFoundationV2) {
      await registerClientV2({
        nome,
        email,
        password,
        registerForm,
        registerModal
      });
      return;
    }

    console.warn("DOZEDEV_STUDIO_ERROR", {
      modulo: "auth",
      acao: "register_legacy_blocked",
      mensagem:
        "Cadastro legado bloqueado para evitar auth.users sem profiles/clients."
    });
    mostrarToast(
      "O cadastro está temporariamente em manutenção. Entre em contato com o suporte DOZEDEV.",
      "warning"
    );
  });
}

async function registerClientV2({
  nome,
  email,
  password,
  registerForm,
  registerModal
}) {
  const submit = registerForm.querySelector("button[type='submit']");
  const siteKey = getTurnstileSiteKey();

  if (!siteKey) {
    mostrarToast("Protecao de seguranca nao configurada.", "error");
    return;
  }

  scheduleTurnstileRender();

  if (!turnstileToken) {
    mostrarToast("Confirme a verificacao de seguranca antes de continuar.", "warning");
    return;
  }

  if (submit) {
    submit.disabled = true;
    submit.textContent = "A criar conta...";
  }

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      "register-studio-client",
      {
        body: {
          name: nome,
          email,
          password,
          turnstileToken
        }
      }
    );

    if (error) {
      console.error("DOZEDEV_STUDIO_ERROR", {
        modulo: "auth",
        acao: "register_client_v2",
        mensagem: error.message,
        details: error
      });
      mostrarToast("Nao foi possivel criar a conta.", "error");
      resetTurnstile();
      return;
    }

    if (data?.error) {
      mostrarToast(data.error, "error");
      resetTurnstile();
      return;
    }

    mostrarToast(
      data?.message || "Conta criada com sucesso. Confirme o email para ativar o acesso.",
      data?.emailSent === false ? "warning" : "success"
    );
    registerForm.reset();
    registerModal.classList.remove("active");
    resetTurnstile();
  } catch (err) {
    console.error("DOZEDEV_STUDIO_ERROR", {
      modulo: "auth",
      acao: "register_client_v2",
      mensagem: err?.message || "Erro inesperado",
      details: err
    });
    mostrarToast("Erro inesperado ao criar conta.", "error");
    resetTurnstile();
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Criar Conta";
    }
  }
}

export function initAuth() {
  protegerPaginasPrivadas();
  protegerAdmin();
  initLogout();
  initLogin();
  initResendConfirmation();
  initRegister();
}
