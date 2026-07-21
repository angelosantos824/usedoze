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
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
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

  const { data, error } =
    await supabaseClient
      .from("project_uploads")
      .select("*")
      .eq("user_id", session.user.id)
      .order("criado_em", {
        ascending: false
      });

  if (error) {
    console.error(error);
    clienteUploadsTable.innerHTML = `
      <tr>
        <td colspan="4">
          Erro ao carregar arquivos.
        </td>
      </tr>
    `;
    return;
  }

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

      for (const arquivo of arquivos) {
        const validationError =
          validarArquivoUpload(arquivo);

        if (validationError) {
          mostrarToast(`${arquivo.name}: ${validationError}`, "error");
          continue;
        }

        if (clienteUploadStatus) {
          clienteUploadStatus.textContent =
            `Enviando ${arquivo.name}...`;
        }

        const safeName =
          sanitizeFileName(arquivo.name);
        const caminho =
          `clients/${profile.client_id}/${Date.now()}-${safeName}`;

        const { error: storageError } =
          await supabaseClient.storage
            .from(PROJECT_FILES_BUCKET)
            .upload(caminho, arquivo, {
              contentType: arquivo.type,
              upsert: false
            });

        if (storageError) {
          console.error(storageError);
          mostrarToast(`Erro ao enviar ${arquivo.name}`, "error");
          continue;
        }

        try {
          await inserirMetadataUpload({
            user_id: session.user.id,
            profile_id: profile.id,
            client_id: profile.client_id,
            email: session.user.email,
            nome_arquivo: arquivo.name,
            caminho,
            tipo: arquivo.type,
            tamanho: arquivo.size,
            storage_bucket: PROJECT_FILES_BUCKET,
            storage_path: caminho
          });
        } catch (uploadDbError) {
          console.error(uploadDbError);
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
