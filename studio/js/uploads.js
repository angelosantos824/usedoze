import { mostrarToast } from "./notifications.js";

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
      arquivo.nome_arquivo;

    const tdTipo =
      document.createElement("td");
    tdTipo.textContent =
      arquivo.tipo || "Arquivo";

    const tdData =
      document.createElement("td");
    tdData.textContent =
      new Date(
        arquivo.criado_em
      ).toLocaleDateString("pt-PT");

    const tdAcoes =
      document.createElement("td");

    const visualizarBtnCriado =
      document.createElement("button");
    visualizarBtnCriado.classList.add(
      "upload-action-btn",
      "visualizarArquivoBtn"
    );
    visualizarBtnCriado.dataset.path =
      arquivo.caminho;
    visualizarBtnCriado.dataset.name =
      arquivo.nome_arquivo;
    visualizarBtnCriado.dataset.type =
      arquivo.tipo;
    visualizarBtnCriado.textContent =
      "Ver";

    const baixarBtnCriado =
      document.createElement("button");
    baixarBtnCriado.classList.add(
      "upload-action-btn",
      "baixarArquivoBtn"
    );
    baixarBtnCriado.dataset.path =
      arquivo.caminho;
    baixarBtnCriado.dataset.name =
      arquivo.nome_arquivo;
    baixarBtnCriado.textContent =
      "Download";

    tdAcoes.append(
      visualizarBtnCriado,
      baixarBtnCriado
    );

    tr.append(
      tdNome,
      tdTipo,
      tdData,
      tdAcoes
    );

    clienteUploadsTable.appendChild(tr);

    const visualizarBtn =
      tr.querySelector(".visualizarArquivoBtn");

    if (visualizarBtn) {
      visualizarBtn.addEventListener("click", async () => {
        const caminho =
          visualizarBtn.dataset.path;

        console.log("Abrindo arquivo:", caminho);

        const { data, error } =
          await supabaseClient.storage
            .from("project-files")
            .createSignedUrl(caminho, 300);

        if (error) {
          console.error(error);
          mostrarToast("Erro ao abrir arquivo.", "error");
          return;
        }

        if (!data?.signedUrl) {
          mostrarToast("URL do arquivo inválida.", "error");
          return;
        }

        abrirPreviewArquivo(
          visualizarBtn.dataset.nome,
          visualizarBtn.dataset.tipo,
          data.signedUrl
        );
      });
    }

    const baixarBtn =
      tr.querySelector(".baixarArquivoBtn");

    if (baixarBtn) {
      baixarBtn.addEventListener("click", async () => {
        const path =
          baixarBtn.dataset.path;
        const nome =
          baixarBtn.dataset.name;

        const { data, error } =
          await supabaseClient.storage
            .from("project-files")
            .download(path);

        if (error) {
          console.error(error);
          mostrarToast("Erro ao baixar arquivo.", "error");
          return;
        }

        const url =
          URL.createObjectURL(data);
        const link =
          document.createElement("a");

        link.href = url;
        link.download = nome;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      });
    }
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
        Pré-visualização indisponível para este tipo de arquivo.
        Use o botão Download.
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
      upload.nome_arquivo;

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
      upload.caminho;
    verBtn.dataset.name =
      upload.nome_arquivo;
    verBtn.dataset.type =
      upload.tipo;
    verBtn.textContent =
      "Ver";

    const baixarBtn =
      document.createElement("button");
    baixarBtn.classList.add("adminBaixarUploadBtn");
    baixarBtn.dataset.path =
      upload.caminho;
    baixarBtn.dataset.name =
      upload.nome_arquivo;
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
        const path =
          btn.dataset.path;
        const nome =
          btn.dataset.name;
        const tipo =
          btn.dataset.type || "";

        console.log("Admin tentando visualizar:", path, tipo);

        const { data, error } =
          await supabaseClient.storage
            .from("project-files")
            .createSignedUrl(path, 300);

        if (error) {
          console.error(error);
          mostrarToast("Erro ao abrir arquivo.", "error");
          return;
        }

        if (!data?.signedUrl) {
          mostrarToast("URL do arquivo inválida.", "error");
          return;
        }

        const modalExiste =
          document.getElementById("filePreviewModal");

        if (modalExiste) {
          abrirPreviewArquivo(nome, tipo, data.signedUrl);
        } else {
          window.open(data.signedUrl, "_blank");
        }
      });
    });

  document
    .querySelectorAll(".adminBaixarUploadBtn")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        const path =
          btn.dataset.path;
        const nome =
          btn.dataset.name;

        const { data, error } =
          await supabaseClient.storage
            .from("project-files")
            .download(path);

        if (error) {
          console.error(error);
          mostrarToast("Erro ao baixar arquivo.", "error");
          return;
        }

        const url =
          URL.createObjectURL(data);
        const link =
          document.createElement("a");

        link.href = url;
        link.download = nome;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      });
    });
}

function initClienteUploadInput() {
  const clienteUploadInput =
    document.getElementById("clienteUploadInput");

  if (!clienteUploadInput) return;

  clienteUploadInput.addEventListener("change", async () => {
    console.log("Upload acionado");

    const arquivos =
      Array.from(clienteUploadInput.files);

    console.log("Arquivos selecionados:", arquivos);

    if (arquivos.length === 0) return;

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
      window.location.href = "login.html";
      return;
    }

    for (const arquivo of arquivos) {
      const caminho =
        `${session.user.id}/${Date.now()}-${arquivo.name}`;

      console.log("Enviando para:", caminho);

      const { error: storageError } =
        await supabaseClient.storage
          .from("project-files")
          .upload(caminho, arquivo, {
            upsert: false
          });

      if (storageError) {
        console.error("Erro Storage:", storageError);
        mostrarToast(`Erro ao enviar ${arquivo.name}`, "error");
        continue;
      }

      const { error: uploadDbError } =
        await supabaseClient
          .from("project_uploads")
          .insert([{
            user_id: session.user.id,
            email: session.user.email,
            nome_arquivo: arquivo.name,
            caminho,
            tipo: arquivo.type
          }]);

      if (uploadDbError) {
        console.error("Erro ao registrar upload:", uploadDbError);
        mostrarToast(
          "Arquivo enviado, mas não apareceu no admin.",
          "error"
        );
        continue;
      }

      mostrarToast(`${arquivo.name} enviado com sucesso!`, "success");
    }

    clienteUploadInput.value = "";
    carregarUploadsCliente();
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
      `📎 ${arquivo.name}`;

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
