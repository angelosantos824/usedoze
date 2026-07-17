import { fetchAdminProfile, getCurrentSession, getSupabase } from "./supabase-admin.js";
import { can } from "./permissions.js";
import { el, showToast, t } from "./ui.js";

const publicAdminPages = ["login.html"];

export async function requireAdmin(permission) {
  const page = location.pathname.split("/").pop() || "dashboard.html";
  if (publicAdminPages.includes(page)) return null;

  try {
    const session = await getCurrentSession();
    if (!session) {
      location.href = "login.html";
      return null;
    }

    const profile = await fetchAdminProfile(session.user.id);
    if (permission && !can(profile, permission)) {
      showToast("O seu perfil nao tem permissao para abrir esta area.", "error");
      setTimeout(() => {
        location.href = "dashboard.html";
      }, 900);
      return null;
    }

    renderAdminShell(profile);
    return { session, profile };
  } catch (error) {
    console.error(error);
    location.href = "login.html";
    return null;
  }
}

export function initLogin() {
  const form = document.getElementById("adminLoginForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector("button[type='submit']");
    submit.disabled = true;
    submit.textContent = "A entrar...";

    try {
      const supabase = getSupabase();
      const email = form.email.value.trim();
      const password = form.password.value.trim();

      await supabase.auth.signOut({ scope: "local" });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      await fetchAdminProfile(data.user.id);
      location.href = "dashboard.html";
    } catch (error) {
      console.error(error);
      showToast(getLoginErrorMessage(error), "error");
    } finally {
      submit.disabled = false;
      submit.textContent = "Entrar";
    }
  });
}

function getLoginErrorMessage(error) {
  if (error?.code === "invalid_credentials") {
    return "Email ou senha invalidos.";
  }

  if (error?.code === "ADMIN_PROFILE_NOT_FOUND") {
    return "Login valido, mas falta um perfil ativo na Area de Gestao.";
  }

  if (error?.code === "ADMIN_PROFILE_FORBIDDEN") {
    return "Este utilizador nao possui acesso de Super Administrador.";
  }

  if (error?.code === "ADMIN_PROFILE_LOAD_FAILED") {
    return "Nao foi possivel carregar o perfil administrativo. Tente novamente.";
  }

  return "Nao foi possivel iniciar sessao administrativa.";
}

function renderAdminShell(profile) {
  const userSlot = document.getElementById("adminUser");
  if (userSlot) {
    userSlot.textContent = "";
    userSlot.append(
      el("div", {}, [
        el("strong", { text: profile.name || profile.email }),
        el("span", { text: t("roles", profile.role) })
      ]),
      logoutButton()
    );
  }

  document.querySelectorAll("[data-role-label]").forEach((node) => {
    node.textContent = t("roles", profile.role);
  });

  const toggle = document.getElementById("drawerToggle");
  const sidebar = document.querySelector(".admin-sidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
}

function logoutButton() {
  const button = el("button", {
    className: "btn-admin secondary",
    type: "button",
    text: "Sair"
  });

  button.addEventListener("click", async () => {
    if (!confirm("Deseja terminar a sessao administrativa?")) return;
    const supabase = getSupabase();
    await supabase.auth.signOut();
    location.href = "login.html";
  });

  return button;
}
