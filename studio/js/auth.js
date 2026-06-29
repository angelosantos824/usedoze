import { mostrarToast } from "./notifications.js";
import { paginaAtual } from "./utils.js";

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
    });

    closeRegisterModal.addEventListener("click", () => {
      registerModal.classList.remove("active");
    });
  }

  if (!registerForm) return;

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome =
      document.getElementById("registerName").value.trim();
    const email =
      document.getElementById("registerEmail").value.trim();
    const password =
      document.getElementById("registerPassword").value.trim();

    if (!nome || !email || !password) return;

    const { data, error } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { nome }
        }
      });

    if (error) {
      console.error(error);
      mostrarToast(error.message, "error");
      return;
    }

    if (data?.user) {
      await supabaseClient
        .from("profiles")
        .insert([{
          id: data.user.id,
          nome,
          email
        }]);

      mostrarToast("Conta criada com sucesso!", "success");
      registerForm.reset();
      registerModal.classList.remove("active");
    }
  });
}

export function initAuth() {
  protegerPaginasPrivadas();
  protegerAdmin();
  initLogout();
  initLogin();
  initRegister();
}
