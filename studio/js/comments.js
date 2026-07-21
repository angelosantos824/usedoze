import { mostrarToast } from "./notifications.js";

let adminBriefingComentarioId = null;

export async function buscarProjetoAtualCliente() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) return null;

  const { data: profile } =
    await supabaseClient
      .from("profiles")
      .select("client_id")
      .eq("id", session.user.id)
      .single();

  if (!profile?.client_id) return null;

  const { data, error } =
    await supabaseClient
      .from("projects")
      .select("*")
      .eq("client_id", profile.client_id)
      .order("updated_at", {
        ascending: false
      });

  if (error) {
    console.error(error);
    return null;
  }

  const priorities = {
    awaiting_client_approval: 1,
    changes_requested: 2,
    in_progress: 3,
    internal_review: 4,
    draft: 5,
    approved: 6,
    completed: 7,
    cancelled: 8
  };

  return [...(data || [])].sort((a, b) => {
    const priorityDiff =
      (priorities[a.status] || 99) - (priorities[b.status] || 99);

    if (priorityDiff !== 0) return priorityDiff;

    return new Date(b.updated_at || b.created_at || 0) -
      new Date(a.updated_at || a.created_at || 0);
  })[0] || null;
}

export async function buscarBriefingAtualCliente() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) return null;

  const { data: profile } =
    await supabaseClient
      .from("profiles")
      .select("client_id")
      .eq("id", session.user.id)
      .single();

  let query =
    supabaseClient
      .from("briefings")
      .select("id,nome,email,client_id");

  if (profile?.client_id) {
    query =
      query.eq("client_id", profile.client_id);
  } else {
    query =
      query.eq("email", session.user.email);
  }

  const { data, error } =
    await query
      .order("created_at", {
        ascending: false
      })
      .limit(1);

  if (error) {
    const message =
      `${error.message || ""} ${error.details || ""}`;

    if (!profile?.client_id || !/client_id|schema cache|column/i.test(message)) {
      console.error(error);
      return null;
    }

    const fallback =
      await supabaseClient
        .from("briefings")
        .select("id,nome,email")
        .eq("email", session.user.email)
        .order("created_at", {
          ascending: false
        })
        .limit(1);

    if (fallback.error) {
      console.error(fallback.error);
      return null;
    }

    return fallback.data?.[0] || null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

function renderComentarios(container, comentarios) {
  container.innerHTML = "";

  if (!comentarios || comentarios.length === 0) {
    container.innerHTML = `
      <p>Nenhum comentario ainda.</p>
    `;
    return;
  }

  comentarios.forEach((comentario) => {
    const div =
      document.createElement("div");

    div.classList.add("comment-item");

    const autor =
      document.createElement("strong");
    autor.textContent =
      comentario.user_nome ||
      comentario.author_role ||
      "Cliente";

    const mensagem =
      document.createElement("p");
    mensagem.textContent =
      comentario.message ||
      comentario.mensagem ||
      "";

    const dataComentario =
      document.createElement("span");
    dataComentario.textContent =
      new Date(
        comentario.created_at ||
        comentario.criado_em
      ).toLocaleString("pt-PT");

    div.append(
      autor,
      mensagem,
      dataComentario
    );

    container.appendChild(div);
  });
}

export async function carregarComentariosProjeto() {
  const projectComments =
    document.getElementById("projectComments");

  if (!projectComments) return;

  const projeto =
    await buscarProjetoAtualCliente();

  if (projeto) {
    const { data, error } =
      await supabaseClient
        .from("project_comments")
        .select("*")
        .eq("project_id", projeto.id)
        .eq("client_id", projeto.client_id)
        .order("created_at", {
          ascending: true
        });

    if (error) {
      console.error(error);
      return;
    }

    renderComentarios(projectComments, data || []);
    return;
  }

  const briefing =
    await buscarBriefingAtualCliente();

  if (!briefing) {
    projectComments.innerHTML = `
      <p>Nenhum briefing encontrado.</p>
    `;
    return;
  }

  const { data, error } =
    await supabaseClient
      .from("project_comments")
      .select("*")
      .eq("briefing_id", briefing.id)
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

    const autor =
      document.createElement("strong");
    autor.textContent =
      comentario.user_nome || "Cliente";

    const mensagem =
      document.createElement("p");
    mensagem.textContent =
      comentario.mensagem;

    const dataComentario =
      document.createElement("span");
    dataComentario.textContent =
      new Date(
        comentario.criado_em
      ).toLocaleString("pt-PT");

    div.append(
      autor,
      mensagem,
      dataComentario
    );

    projectComments.appendChild(div);
  });
}

export async function carregarComentariosAdmin(briefingId) {
  adminBriefingComentarioId =
    briefingId;

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

  if (error) {
    console.error(error);
    adminProjectComments.innerHTML = `
      <p>Erro ao carregar comentários.</p>
    `;
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

    const autor =
      document.createElement("strong");
    autor.textContent =
      comentario.user_nome || "Cliente";

    const mensagem =
      document.createElement("p");
    mensagem.textContent =
      comentario.mensagem || "";

    const dataComentario =
      document.createElement("span");
    dataComentario.textContent =
      new Date(
        comentario.criado_em
      ).toLocaleString("pt-PT");

    div.append(
      autor,
      mensagem,
      dataComentario
    );

    adminProjectComments.appendChild(div);
  });
}

function initCommentForm() {
  const commentForm =
    document.getElementById("commentForm");
  const commentInput =
    document.getElementById("commentInput");

  if (!commentForm) return;

  commentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const mensagem =
      commentInput.value.trim();

    if (!mensagem) return;

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) return;

    const projeto =
      await buscarProjetoAtualCliente();

    if (projeto) {
      const { error } =
        await supabaseClient
          .from("project_comments")
          .insert([{
            project_id: projeto.id,
            client_id: projeto.client_id,
            author_user_id: session.user.id,
            author_role: "client",
            comment_type: "message",
            message: mensagem
          }]);

      if (error) {
        console.error(error);
        mostrarToast("Erro ao enviar comentario.", "error");
        return;
      }

      commentInput.value = "";
      mostrarToast("Comentario enviado!", "success");
      carregarComentariosProjeto();
      return;
    }

    const briefing =
      await buscarBriefingAtualCliente();

    if (!briefing) {
      mostrarToast(
        "Nenhum briefing encontrado para este usuário.",
        "error"
      );
      return;
    }

    const { error } =
      await supabaseClient
        .from("project_comments")
        .insert([{
          briefing_id: briefing.id,
          user_id: session.user.id,
          user_nome: briefing.nome || session.user.email,
          mensagem
        }]);

    if (error) {
      console.error(error);
      mostrarToast("Erro ao enviar comentário.", "error");
      return;
    }

    commentInput.value = "";
    mostrarToast("Comentário enviado!", "success");
    carregarComentariosProjeto();
  });
}

function initAdminCommentForm() {
  const adminCommentForm =
    document.getElementById("adminCommentForm");
  const adminCommentInput =
    document.getElementById("adminCommentInput");

  if (!adminCommentForm || !adminCommentInput) return;

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
      mostrarToast("Erro ao enviar resposta.", "error");
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
    mostrarToast("Resposta enviada!", "success");
    carregarComentariosAdmin(adminBriefingComentarioId);
  });
}

export function initComments() {
  initCommentForm();
  carregarComentariosProjeto();
  initAdminCommentForm();
}
