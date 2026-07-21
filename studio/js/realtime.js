import {
  carregarAdminReal,
  carregarCardsAdmin
} from "./admin.js";
import {
  carregarComentariosProjeto,
  buscarBriefingAtualCliente,
  buscarProjetoAtualCliente
} from "./comments.js";
import {
  carregarNotificacoes,
  mostrarToast
} from "./notifications.js";
import { carregarVouchers } from "./vouchers.js";

export async function iniciarRealtimeCliente() {
  if (
    !window.location.pathname.includes("dashboard.html")
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
        mostrarToast("Nova notificação recebida!", "info");
      }
    )
    .subscribe();
}

export async function iniciarRealtimeComentariosCliente() {
  if (!window.location.pathname.includes("dashboard.html")) return;

  const projeto =
    await buscarProjetoAtualCliente();

  if (projeto) {
    supabaseClient
      .channel("cliente-comentarios-projeto")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_comments",
          filter: `project_id=eq.${projeto.id}`
        },
        () => {
          carregarComentariosProjeto();
          mostrarToast("Nova mensagem recebida!", "info");
        }
      )
      .subscribe();
    return;
  }

  const briefing =
    await buscarBriefingAtualCliente();

  if (!briefing) return;

  supabaseClient
    .channel("cliente-comentarios")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "project_comments",
        filter: `briefing_id=eq.${briefing.id}`
      },
      () => {
        carregarComentariosProjeto();
        mostrarToast("Nova mensagem recebida!", "info");
      }
    )
    .subscribe();
}

export function iniciarRealtimeAdmin() {
  if (
    !window.location.pathname.includes("admin.html")
  ) {
    return;
  }

  supabaseClient
    .channel("admin-realtime")
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

export function initRealtime() {
  iniciarRealtimeAdmin();
  iniciarRealtimeCliente();
  iniciarRealtimeComentariosCliente();
}
