import { mostrarToast } from "./notifications.js";

const PROJECT_FILES_BUCKET = "project-files";
const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

function sanitizeFileName(fileName) {
  const sanitized = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

  return sanitized || "arquivo";
}

function logUploadFailure({
  stage,
  error,
  bucket = PROJECT_FILES_BUCKET,
  path = "",
  clientId = "",
  projectId = ""
}) {
  console.error("Falha no upload", {
    stage,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    bucket,
    path,
    clientId,
    projectId
  });
}

function validarArquivoUpload(arquivo) {
  if (!ALLOWED_UPLOAD_TYPES.includes(arquivo.type)) {
    return "Tipo de arquivo nao permitido.";
  }

  if (arquivo.size > MAX_UPLOAD_SIZE_BYTES) {
    return "Arquivo acima do limite de 20 MB.";
  }

  return "";
}

function isSchemaColumnError(error) {
  const message =
    `${error?.message || ""} ${error?.details || ""}`;

  return /column|schema cache|Could not find/i.test(message);
}

async function carregarIdentidadeUpload(session) {
  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select("id,nome,email,client_id")
      .eq("id", session.user.id)
      .single();

  if (error || !data) {
    console.error(error);
    return null;
  }

  return data;
}

function getProjectPriority(status) {
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

  return priorities[status] || 99;
}

async function carregarProjetoUpload(clientId) {
  const { data, error } =
    await supabaseClient
      .from("projects")
      .select("id,status,updated_at,created_at")
      .eq("client_id", clientId)
      .order("updated_at", {
        ascending: false
      });

  if (error) {
    logUploadFailure({
      stage: "load_project",
      error,
      clientId
    });
    return null;
  }

  return [...(data || [])].sort((a, b) => {
    const priorityDiff =
      getProjectPriority(a.status) - getProjectPriority(b.status);

    if (priorityDiff !== 0) return priorityDiff;

    return new Date(b.updated_at || b.created_at || 0) -
      new Date(a.updated_at || a.created_at || 0);
  })[0] || null;
}

async function inserirMetadataUpload(metadata) {
  const { error } =
    await supabaseClient
      .from("project_uploads")
      .insert([metadata]);

  if (!error) return;

  if (!isSchemaColumnError(error)) {
    throw error;
  }

  const {
    client_id,
    project_id,
    profile_id,
    storage_bucket,
    storage_path,
    tamanho,
    ...legacyMetadata
  } = metadata;

  const fallback =
    await supabaseClient
      .from("project_uploads")
      .insert([legacyMetadata]);

  if (fallback.error) {
    throw fallback.error;
  }
}

async function criarSignedUrl(caminho) {
  const { data, error } =
    await supabaseClient.storage
      .from(PROJECT_FILES_BUCKET)
      .createSignedUrl(caminho, 300);

  if (error) {
    throw error;
  }

  return data?.signedUrl || "";
}

async function baixarArquivoPrivado(caminho) {
  const { data, error } =
    await supabaseClient.storage
      .from(PROJECT_FILES_BUCKET)
      .download(caminho);

  if (error) {
    throw error;
  }

  return data;
}

export async function carregarUploadsCliente() {
  const clienteUploadsTable =
    document.getElementById("clienteUploadsTable");

  if (!clienteUploadsTable) return;

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) return;

  const profile =
    await carregarIdentidadeUpload(session);

  if (!profile?.client_id) return;

  const { data, error } =
    await supabaseClient
      .from("project_uploads")
      .select("*")
      .eq("client_id", profile.client_id)
      .order("criado_em", {
        ascending: false
      });

  if (error) {
    logUploadFailure({
      stage: "load_history_by_client",
      error,
      clientId: profile.client_id
    });

    const fallback =
      await supabaseClient
        .from("project_uploads")
        .select("*")
        .eq("user_id", session.user.id)
        .order("criado_em", {
          ascending: false
        });

    if (fallback.error) {
      logUploadFailure({
        stage: "load_history_by_user",
        error: fallback.error,
        clientId: profile.client_id
      });
      clienteUploadsTable.innerHTML = `
        <tr>
          <td colspan="4">
            Erro ao carregar arquivos.
          </td>
        </tr>
      `;
      return;
    }

    renderUploadsCliente(clienteUploadsTable, fallback.data || []);
    return;
  }

  renderUploadsCliente(clienteUploadsTable, data || []);
}

function renderUploadsCliente(clienteUploadsTable, data) {
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

    const tdNome =
      document.createElement("td");
    tdNome.textContent =
      arquivo.nome_arquivo || "Arquivo";

    const tdTipo =
      document.createElement("td");
    tdTipo.textContent =
      arquivo.tipo || "Arquivo";

    const tdData =
      document.createElement("td");
    tdData.textContent =
      arquivo.criado_em
        ? new Date(arquivo.criado_em).toLocaleDateString("pt-PT")
        : "-";

    const tdAcoes =
      document.createElement("td");

    const visualizarBtn =
      document.createElement("button");
    visualizarBtn.classList.add(
      "upload-action-btn",
      "visualizarArquivoBtn"
    );
    visualizarBtn.dataset.path =
      arquivo.caminho || arquivo.storage_path || "";
    visualizarBtn.dataset.name =
      arquivo.nome_arquivo || "Arquivo";
    visualizarBtn.dataset.type =
      arquivo.tipo || "";
    visualizarBtn.textContent =
      "Ver";

    const baixarBtn =
      document.createElement("button");
    baixarBtn.classList.add(
      "upload-action-btn",
      "baixarArquivoBtn"
    );
    baixarBtn.dataset.path =
      arquivo.caminho || arquivo.storage_path || "";
    baixarBtn.dataset.name =
      arquivo.nome_arquivo || "arquivo";
    baixarBtn.textContent =
      "Download";

    tdAcoes.append(
      visualizarBtn,
      baixarBtn
    );

    tr.append(
      tdNome,
      tdTipo,
      tdData,
      tdAcoes
    );

    clienteUploadsTable.appendChild(tr);

    visualizarBtn.addEventListener("click", async () => {
      try {
        const signedUrl =
          await criarSignedUrl(visualizarBtn.dataset.path);

        if (!signedUrl) {
          mostrarToast("URL do arquivo invalida.", "error");
          return;
        }

        abrirPreviewArquivo(
          visualizarBtn.dataset.name,
          visualizarBtn.dataset.type,
          signedUrl
        );
      } catch (error) {
        console.error(error);
        mostrarToast("Erro ao abrir arquivo.", "error");
      }
    });

    baixarBtn.addEventListener("click", async () => {
      try {
        const blob =
          await baixarArquivoPrivado(baixarBtn.dataset.path);
        const url =
          URL.createObjectURL(blob);
        const link =
          document.createElement("a");

        link.href = url;
        link.download = baixarBtn.dataset.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(error);
        mostrarToast("Erro ao baixar arquivo.", "error");
      }
    });
  });
}

export function abrirPreviewArquivo(nome, tipo, url) {
  const modal =
    document.getElementById("filePreviewModal");
  const title =
    document.getElementById("filePreviewTitle");
  const area =
    document.getElementById("filePreviewArea");

  if (!modal || !title || !area) return;

  title.textContent =
    nome || "Visualizar arquivo";

  area.innerHTML = "";

  const tipoArquivo =
    tipo || "";

  if (tipoArquivo.includes("image")) {
    const img =
      document.createElement("img");
    img.src = url;
    img.alt = nome;
    area.appendChild(img);
  } else if (tipoArquivo.includes("pdf")) {
    const iframe =
      document.createElement("iframe");
    iframe.src = url;
    area.appendChild(iframe);
  } else {
    area.innerHTML = `
      <p>
        Pre-visualizacao indisponivel para este tipo de arquivo.
        Use o botao Download.
      </p>
    `;
  }

  modal.classList.add("active");
}

export async function carregarAdminUploads() {
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

    const tdNome =
      document.createElement("td");
    tdNome.textContent =
      upload.nome_arquivo || "Arquivo";

    const tdEmail =
      document.createElement("td");
    tdEmail.textContent =
      upload.email || "Cliente";

    const tdTipo =
      document.createElement("td");
    tdTipo.textContent =
      upload.tipo || "Arquivo";

    const tdStatus =
      document.createElement("td");
    const status =
      document.createElement("span");
    status.classList.add("status", "recebido");
    status.textContent =
      "Recebido";
    tdStatus.appendChild(status);

    const tdAcoes =
      document.createElement("td");
    tdAcoes.classList.add("acoes");

    const verBtn =
      document.createElement("button");
    verBtn.classList.add("adminVerUploadBtn");
    verBtn.dataset.path =
      upload.caminho || upload.storage_path || "";
    verBtn.dataset.name =
      upload.nome_arquivo || "Arquivo";
    verBtn.dataset.type =
      upload.tipo || "";
    verBtn.textContent =
      "Ver";

    const baixarBtn =
      document.createElement("button");
    baixarBtn.classList.add("adminBaixarUploadBtn");
    baixarBtn.dataset.path =
      upload.caminho || upload.storage_path || "";
    baixarBtn.dataset.name =
      upload.nome_arquivo || "arquivo";
    baixarBtn.textContent =
      "Download";

    tdAcoes.append(verBtn, baixarBtn);

    tr.append(
      tdNome,
      tdEmail,
      tdTipo,
      tdStatus,
      tdAcoes
    );

    tableBody.appendChild(tr);
  });

  ativarBotoesAdminUploads();
}

export function ativarBotoesAdminUploads() {
  document
    .querySelectorAll(".adminVerUploadBtn")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const signedUrl =
            await criarSignedUrl(btn.dataset.path);

          if (!signedUrl) {
            mostrarToast("URL do arquivo invalida.", "error");
            return;
          }

          const modalExiste =
            document.getElementById("filePreviewModal");

          if (modalExiste) {
            abrirPreviewArquivo(
              btn.dataset.name,
              btn.dataset.type || "",
              signedUrl
            );
          } else {
            window.open(signedUrl, "_blank");
          }
        } catch (error) {
          console.error(error);
          mostrarToast("Erro ao abrir arquivo.", "error");
        }
      });
    });

  document
    .querySelectorAll(".adminBaixarUploadBtn")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const blob =
            await baixarArquivoPrivado(btn.dataset.path);
          const url =
            URL.createObjectURL(blob);
          const link =
            document.createElement("a");

          link.href = url;
          link.download = btn.dataset.name;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error(error);
          mostrarToast("Erro ao baixar arquivo.", "error");
        }
      });
    });
}

function initClienteUploadInput() {
  const clienteUploadInput =
    document.getElementById("clienteUploadInput");
  const clienteUploadStatus =
    document.getElementById("clienteUploadStatus");
  const uploadButton =
    clienteUploadInput?.closest(".upload-btn");

  if (!clienteUploadInput) return;

  clienteUploadInput.addEventListener("change", async () => {
    const arquivos =
      Array.from(clienteUploadInput.files);

    if (arquivos.length === 0) return;
    if (clienteUploadInput.disabled) return;

    const {
      data: { session },
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      window.location.href = "login.html";
      return;
    }

    const profile =
      await carregarIdentidadeUpload(session);

    if (!profile?.client_id) {
      mostrarToast(
        "Perfil sem cliente associado. Entre em contato com o suporte DOZEDEV.",
        "error"
      );
      clienteUploadInput.value = "";
      return;
    }

    clienteUploadInput.disabled = true;
    uploadButton?.classList.add("disabled");

    try {
      let enviados = 0;
      const projeto =
        await carregarProjetoUpload(profile.client_id);
      const projectId =
        projeto?.id || "general";

      for (const arquivo of arquivos) {
        const validationError =
          validarArquivoUpload(arquivo);

        if (validationError) {
          logUploadFailure({
            stage: "validation",
            error: {
              message: validationError
            },
            clientId: profile.client_id,
            projectId
          });
          mostrarToast(`${arquivo.name}: ${validationError}`, "error");
          continue;
        }

        if (clienteUploadStatus) {
          clienteUploadStatus.textContent =
            `Enviando ${arquivo.name}...`;
        }

        const safeName =
          sanitizeFileName(arquivo.name);
        const uploadId =
          crypto.randomUUID();
        const caminho =
          `clients/${profile.client_id}/projects/${projectId}/${uploadId}-${safeName}`;

        const { error: storageError } =
          await supabaseClient.storage
            .from(PROJECT_FILES_BUCKET)
            .upload(caminho, arquivo, {
              contentType: arquivo.type,
              upsert: false
            });

        if (storageError) {
          logUploadFailure({
            stage: "storage_upload",
            error: storageError,
            path: caminho,
            clientId: profile.client_id,
            projectId
          });
          mostrarToast(`Erro ao enviar ${arquivo.name}`, "error");
          continue;
        }

        try {
          const signedUrl =
            await criarSignedUrl(caminho);

          if (!signedUrl) {
            throw new Error("URL assinada nao foi criada.");
          }
        } catch (signedUrlError) {
          logUploadFailure({
            stage: "signed_url",
            error: signedUrlError,
            path: caminho,
            clientId: profile.client_id,
            projectId
          });

          await supabaseClient.storage
            .from(PROJECT_FILES_BUCKET)
            .remove([caminho]);
          mostrarToast(`Erro ao validar ${arquivo.name}`, "error");
          continue;
        }

        try {
          await inserirMetadataUpload({
            user_id: session.user.id,
            profile_id: profile.id,
            client_id: profile.client_id,
            project_id:
              projeto?.id || null,
            email: session.user.email,
            nome_arquivo: arquivo.name,
            caminho,
            tipo: arquivo.type,
            tamanho: arquivo.size,
            storage_bucket: PROJECT_FILES_BUCKET,
            storage_path: caminho
          });
        } catch (uploadDbError) {
          logUploadFailure({
            stage: "metadata_insert",
            error: uploadDbError,
            path: caminho,
            clientId: profile.client_id,
            projectId
          });

          await supabaseClient.storage
            .from(PROJECT_FILES_BUCKET)
            .remove([caminho]);
          mostrarToast(
            "Arquivo enviado, mas nao apareceu no admin.",
            "error"
          );
          continue;
        }

        enviados += 1;
        mostrarToast(`${arquivo.name} enviado com sucesso!`, "success");
      }

      if (clienteUploadStatus) {
        clienteUploadStatus.textContent =
          enviados > 0
            ? `${enviados} arquivo(s) enviado(s).`
            : "";
      }

      carregarUploadsCliente();
    } finally {
      clienteUploadInput.value = "";
      clienteUploadInput.disabled = false;
      uploadButton?.classList.remove("disabled");
    }
  });
}

function initFilePreviewModal() {
  const filePreviewModal =
    document.getElementById("filePreviewModal");
  const closeFilePreviewModal =
    document.getElementById("closeFilePreviewModal");

  if (!filePreviewModal || !closeFilePreviewModal) return;

  closeFilePreviewModal.addEventListener("click", () => {
    filePreviewModal.classList.remove("active");
  });

  filePreviewModal.addEventListener("click", (event) => {
    if (event.target === filePreviewModal) {
      filePreviewModal.classList.remove("active");
    }
  });
}

export function mostrarArquivos() {
  const uploadPreview =
    document.getElementById("uploadPreview");
  const briefingFiles =
    document.getElementById("briefingFiles");

  if (!uploadPreview || !briefingFiles.files.length) return;

  uploadPreview.innerHTML = "";

  [...briefingFiles.files].forEach((arquivo) => {
    const div =
      document.createElement("div");

    div.textContent =
      `Arquivo: ${arquivo.name}`;

    uploadPreview.appendChild(div);
  });
}

function initUploadDropzone() {
  const uploadDropzone =
    document.getElementById("uploadDropzone");
  const briefingFiles =
    document.getElementById("briefingFiles");

  if (!uploadDropzone || !briefingFiles) return;

  uploadDropzone.addEventListener("click", () => {
    briefingFiles.click();
  });

  uploadDropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadDropzone.classList.add("dragover");
  });

  uploadDropzone.addEventListener("dragleave", () => {
    uploadDropzone.classList.remove("dragover");
  });

  uploadDropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadDropzone.classList.remove("dragover");
    briefingFiles.files =
      event.dataTransfer.files;
    mostrarArquivos();
  });

  briefingFiles.addEventListener("change", () => {
    mostrarArquivos();
  });
}

export function initUploads() {
  initClienteUploadInput();
  carregarUploadsCliente();
  initFilePreviewModal();
  initUploadDropzone();
}
