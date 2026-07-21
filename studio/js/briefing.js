import { mostrarToast } from "./notifications.js";
import { validarVoucher } from "./vouchers.js";

const BRIEFING_SUCCESS_MESSAGE =
  "Briefing enviado com sucesso. A equipa DOZEDEV irá analisar as informações.";

async function carregarIdentidadeBriefing(session) {
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

function isSchemaColumnError(error) {
  const message =
    `${error?.message || ""} ${error?.details || ""}`;

  return /column|schema cache|Could not find/i.test(message);
}

async function inserirBriefing(dadosBriefing) {
  const { data, error } =
    await supabaseClient
      .from("briefings")
      .insert([dadosBriefing])
      .select("id")
      .single();

  if (!error) {
    return data;
  }

  if (!isSchemaColumnError(error)) {
    throw error;
  }

  const {
    client_id,
    profile_id,
    user_id,
    ...dadosLegados
  } = dadosBriefing;

  const fallback =
    await supabaseClient
      .from("briefings")
      .insert([dadosLegados])
      .select("id")
      .single();

  if (fallback.error) {
    throw fallback.error;
  }

  return fallback.data;
}

function validarCampoObrigatorio(id, mensagem) {
  const element =
    document.getElementById(id);
  const value =
    element?.value.trim() || "";

  if (!value) {
    element?.focus();
    mostrarToast(mensagem, "error");
    return false;
  }

  return true;
}

function initVoucherModal() {
  const tipoProjetoInputs = document.querySelectorAll(
    'input[name="tipoProjeto"]'
  );
  const voucherModal =
    document.getElementById("voucherModal");
  const closeVoucherModal =
    document.getElementById("closeVoucherModal");
  const acceptVoucherRules =
    document.getElementById("acceptVoucherRules");
  const cancelVoucherRules =
    document.getElementById("cancelVoucherRules");
  const voucherCodeGroup =
    document.getElementById("voucherCodeGroup");
  const voucherCode =
    document.getElementById("voucherCode");
  const voucherAlert =
    document.getElementById("voucherAlert");
  const quantidadePaginas =
    document.getElementById("quantidadePaginas");
  const prazoDesejado =
    document.getElementById("prazoDesejado");
  const funcionalidades =
    document.querySelectorAll(".funcionalidade");

  function abrirModalVoucher() {
    if (voucherModal) {
      voucherModal.classList.add("active");
    }
  }

  function fecharModalVoucher() {
    if (voucherModal) {
      voucherModal.classList.remove("active");
    }
  }

  function ativarVoucher() {
    abrirModalVoucher();

    if (voucherCodeGroup) {
      voucherCodeGroup.style.display = "flex";
    }

    if (voucherCode) {
      voucherCode.setAttribute("required", "required");
      voucherCode.placeholder = "Ex: VOUCHERDOZE-0001";
    }

    if (voucherAlert) {
      voucherAlert.classList.add("active");
      voucherAlert.textContent =
        "Voucher promocional selecionado: limite de 3 páginas, prazo de até 30 dias e funcionalidades específicas.";
    }

    if (quantidadePaginas) {
      quantidadePaginas.value = "3 Páginas";
      quantidadePaginas.disabled = true;
    }

    if (prazoDesejado) {
      prazoDesejado.value = "Até 30 dias";
      prazoDesejado.readOnly = true;
    }

    funcionalidades.forEach((item) => {
      if (item.classList.contains("voucher-func")) {
        item.checked = true;
        item.disabled = false;
      } else {
        item.checked = false;
        item.disabled = true;
      }
    });
  }

  function desativarVoucher() {
    fecharModalVoucher();

    if (voucherCodeGroup) {
      voucherCodeGroup.style.display = "none";
    }

    if (voucherCode) {
      voucherCode.removeAttribute("required");
      voucherCode.value = "";
    }

    if (voucherAlert) {
      voucherAlert.classList.remove("active");
      voucherAlert.textContent = "";
    }

    if (quantidadePaginas) {
      quantidadePaginas.disabled = false;
      quantidadePaginas.value = "";
    }

    if (prazoDesejado) {
      prazoDesejado.readOnly = false;
      prazoDesejado.value = "";
    }

    funcionalidades.forEach((item) => {
      item.disabled = false;
      item.checked = false;
    });

    const normalRadio = document.querySelector(
      'input[name="tipoProjeto"][value="normal"]'
    );

    if (normalRadio) {
      normalRadio.checked = true;
    }
  }

  tipoProjetoInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.value === "voucher" && input.checked) {
        ativarVoucher();
      }

      if (input.value === "normal" && input.checked) {
        desativarVoucher();
      }
    });
  });

  if (closeVoucherModal) {
    closeVoucherModal.addEventListener(
      "click",
      fecharModalVoucher
    );
  }

  if (acceptVoucherRules) {
    acceptVoucherRules.addEventListener("click", () => {
      fecharModalVoucher();
      if (voucherCode) {
        voucherCode.focus();
      }
    });
  }

  if (cancelVoucherRules) {
    cancelVoucherRules.addEventListener(
      "click",
      desativarVoucher
    );
  }

  if (voucherModal) {
    voucherModal.addEventListener("click", (event) => {
      if (event.target === voucherModal) {
        fecharModalVoucher();
      }
    });
  }
}

function initBriefingForm() {
  const briefingForm =
    document.getElementById("briefingForm");
  const voucherCode =
    document.getElementById("voucherCode");
  const submitButton =
    briefingForm?.querySelector('button[type="submit"]');

  if (!briefingForm) return;

  briefingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (submitButton?.disabled) return;

    try {
      if (!validarCampoObrigatorio("empresa", "Informe o nome da empresa.")) return;
      if (!validarCampoObrigatorio("nome", "Informe o responsavel.")) return;
      if (!validarCampoObrigatorio("telefone", "Informe o WhatsApp.")) return;
      if (!validarCampoObrigatorio("descricaoProjeto", "Descreva o projeto.")) return;

      const {
        data: { session },
        error: sessionError
      } = await supabaseClient.auth.getSession();

      if (sessionError || !session) {
        window.location.href = "login.html";
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";

      const profile =
        await carregarIdentidadeBriefing(session);

      if (!profile?.client_id) {
        mostrarToast(
          "Perfil sem cliente associado. Entre em contato com o suporte DOZEDEV.",
          "error"
        );
        return;
      }

      const emailLogado =
        session.user.email || "";

      const funcionalidadesSelecionadas = [];

      document
        .querySelectorAll(".funcionalidade:checked")
        .forEach((item) => {
          funcionalidadesSelecionadas.push(item.value);
        });

      let voucherValidado = null;

      const tipoProjetoSelecionado =
        document.querySelector(
          'input[name="tipoProjeto"]:checked'
        )?.value || "normal";

      if (tipoProjetoSelecionado === "voucher") {
        voucherValidado =
          await validarVoucher(
            voucherCode?.value.trim()
          );

        if (!voucherValidado) return;
      }

      const dadosBriefing = {
        user_id:
          session.user.id,
        profile_id:
          profile.id,
        client_id:
          profile.client_id,
        nome:
          document.getElementById("nome")?.value.trim() || emailLogado,
        email:
          document.getElementById("email")?.value.trim() || emailLogado,
        telefone:
          document.getElementById("telefone")?.value.trim() || "",
        empresa:
          document.getElementById("empresa")?.value.trim() || "",
        instagram:
          document.getElementById("instagram")?.value.trim() || "",
        tipo_projeto:
          tipoProjetoSelecionado,
        voucher_codigo:
          document.getElementById("voucherCode")?.value.trim() || "",
        paginas:
          document.getElementById("quantidadePaginas")?.value || "",
        prazo:
          document.getElementById("prazoDesejado")?.value.trim() || "",
        descricao:
          document.getElementById("descricaoProjeto")?.value.trim() || "",
        cores:
          document.getElementById("coresDesejadas")?.value.trim() || "",
        funcionalidades:
          funcionalidadesSelecionadas,
        status:
          "Recebido"
      };

      const briefingCriado =
        await inserirBriefing(dadosBriefing);

      if (voucherValidado) {
        const novosUsos =
          voucherValidado.usos + 1;
        const limiteAtingido =
          novosUsos >= voucherValidado.limite_uso;

        await supabaseClient
          .from("vouchers")
          .update({
            usos: novosUsos,
            ativo: !limiteAtingido
          })
          .eq("id", voucherValidado.id);
      }

      mostrarToast(BRIEFING_SUCCESS_MESSAGE, "success");
      briefingForm.reset();
      setTimeout(() => {
        window.location.href =
          `dashboard.html?briefing=${encodeURIComponent(
            briefingCriado?.id || ""
          )}`;
      }, 1200);
    } catch (err) {
      console.error(err);
      mostrarToast(
        "Erro inesperado ao enviar briefing.",
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Enviar Briefing";
      }
    }
  });
}

export function initBriefing() {
  initVoucherModal();
  initBriefingForm();
}
