import { mostrarToast } from "./notifications.js";

let adminBriefingComentarioId = null;

export async function buscarBriefingAtualCliente() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) return null;

  const { data, error } =
    await supabaseClient
      .from("briefings")
      .select("id,nome,email")
      .eq("email", session.user.email)
      .order("created_at", {
        ascending: false
      })
      .limit(1);

  if (error) {
    console.error(error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

export async function carregarComentariosProjeto() {
  const projectComments =
    document.getElementById("projectComments");

  if (!projectComments) return;

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
  console.log("Briefing aberto:", briefingId);

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

  console.log("Comentários:", data);
  console.log("Erro comentários:", error);

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

    console.log(
      "Admin respondendo no briefing:",
      adminBriefingComentarioId
    );

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
