import { mostrarToast } from "./notifications.js";

export function gerarCodigoVoucher() {
  const numero =
    String(
      Math.floor(Math.random() * 9999)
    ).padStart(4, "0");

  return `VOUCHERDOZE-${numero}`;
}

export async function carregarVouchers() {
  const voucherList =
    document.getElementById("voucherList");

  if (!voucherList) return;

  const { data, error } =
    await supabaseClient
      .from("vouchers")
      .select("*")
      .order("criado_em", {
        ascending: false
      });

  if (error) {
    console.error(error);
    mostrarToast("Erro ao carregar vouchers.", "error");
    return;
  }

  voucherList.innerHTML = "";

  data.forEach((voucher) => {
    const card =
      document.createElement("div");

    card.classList.add("voucher-card");

    const titulo =
      document.createElement("h3");
    titulo.textContent =
      voucher.codigo;

    const limite =
      document.createElement("p");
    limite.append(
      document.createTextNode("Limite: "),
      document.createTextNode(voucher.limite_uso)
    );

    const usos =
      document.createElement("p");
    usos.append(
      document.createTextNode("Usos: "),
      document.createTextNode(voucher.usos)
    );

    const estado =
      document.createElement("span");
    estado.textContent =
      voucher.ativo ? "Ativo" : "Inativo";

    const toggle =
      document.createElement("button");
    toggle.classList.add("voucher-toggle-btn");
    toggle.dataset.id =
      voucher.id;
    toggle.dataset.ativo =
      voucher.ativo;
    toggle.type =
      "button";
    toggle.textContent =
      voucher.ativo ? "Desativar" : "Reativar";

    card.append(
      titulo,
      limite,
      usos,
      estado,
      toggle
    );

    voucherList.appendChild(card);

    const toggleBtn =
      card.querySelector(".voucher-toggle-btn");

    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", async () => {
      const id =
        toggleBtn.dataset.id;
      const ativoAtual =
        toggleBtn.dataset.ativo === "true";

      const { error } =
        await supabaseClient
          .from("vouchers")
          .update({
            ativo: !ativoAtual
          })
          .eq("id", id);

      if (error) {
        console.error(error);
        mostrarToast("Erro ao atualizar voucher.", "error");
        return;
      }

      carregarVouchers();
      mostrarToast(
        ativoAtual
          ? "Voucher desativado."
          : "Voucher reativado.",
        "success"
      );
    });
  });
}

export async function validarVoucher(codigo) {
  if (!codigo) return false;

  const { data, error } =
    await supabaseClient
      .from("vouchers")
      .select("*")
      .eq("codigo", codigo)
      .single();

  if (error || !data) {
    alert("Voucher inválido.");
    return false;
  }

  if (!data.ativo) {
    alert("Voucher desativado.");
    return false;
  }

  const hoje = new Date();
  const validade =
    new Date(data.validade);

  if (hoje > validade) {
    alert("Voucher expirado.");
    return false;
  }

  if (data.usos >= data.limite_uso) {
    alert("Voucher já utilizado.");
    return false;
  }

  return data;
}

export async function carregarAdminVouchers() {
  const tableBody =
    document.querySelector("tbody");
  const panelTitle =
    document.querySelector(".panel-header h2");

  if (!tableBody) return;

  if (panelTitle) {
    panelTitle.textContent = "Vouchers";
  }

  const { data, error } =
    await supabaseClient
      .from("vouchers")
      .select("*")
      .order("criado_em", {
        ascending: false
      });

  if (error) {
    console.error(error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          Erro ao carregar vouchers.
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
          Nenhum voucher encontrado.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach((voucher) => {
    const tr =
      document.createElement("tr");

    const tdCodigo =
      document.createElement("td");
    tdCodigo.textContent =
      voucher.codigo;

    const tdLimite =
      document.createElement("td");
    tdLimite.textContent =
      `Limite: ${voucher.limite_uso}`;

    const tdUsos =
      document.createElement("td");
    tdUsos.textContent =
      `Usos: ${voucher.usos}`;

    const tdStatus =
      document.createElement("td");
    const status =
      document.createElement("span");
    status.classList.add(
      "status",
      voucher.ativo ? "recebido" : "finalizado"
    );
    status.textContent =
      voucher.ativo ? "Ativo" : "Inativo";
    tdStatus.appendChild(status);

    const tdAcoes =
      document.createElement("td");
    tdAcoes.classList.add("acoes");

    const toggleBtn =
      document.createElement("button");
    toggleBtn.classList.add("toggleVoucherBtn");
    toggleBtn.dataset.id =
      voucher.id;
    toggleBtn.dataset.ativo =
      voucher.ativo;
    toggleBtn.textContent =
      voucher.ativo ? "Desativar" : "Reativar";
    tdAcoes.appendChild(toggleBtn);

    tr.append(
      tdCodigo,
      tdLimite,
      tdUsos,
      tdStatus,
      tdAcoes
    );

    tableBody.appendChild(tr);
  });

  ativarBotoesVoucherAdmin();
}

export function ativarBotoesVoucherAdmin() {
  document
    .querySelectorAll(".toggleVoucherBtn")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const ativoAtual = btn.dataset.ativo === "true";

        const { error } =
          await supabaseClient
            .from("vouchers")
            .update({
              ativo: !ativoAtual
            })
            .eq("id", id);

        if (error) {
          console.error(error);
          alert("Erro ao atualizar voucher.");
          return;
        }

        carregarAdminVouchers();
      });
    });
}

function initGeradorVouchers() {
  const gerarVoucherBtn =
    document.getElementById("gerarVoucherBtn");

  if (!gerarVoucherBtn) return;

  gerarVoucherBtn.addEventListener("click", async () => {
    const codigo =
      gerarCodigoVoucher();

    const validade =
      new Date();

    validade.setDate(
      validade.getDate() + 30
    );

    const { error } =
      await supabaseClient
        .from("vouchers")
        .insert([{
          codigo,
          validade,
          ativo: true,
          limite_uso: 1
        }]);

    if (error) {
      console.error(error);
      mostrarToast("Erro ao gerar voucher.", "error");
      return;
    }

    mostrarToast("Voucher criado com sucesso!", "success");
    carregarVouchers();
  });
}

export function initVouchers() {
  initGeradorVouchers();
  carregarVouchers();
}
