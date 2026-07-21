import { initAdmin } from "./admin.js?v=20260721-4";
import {
  initAuth,
  protegerAdmin,
  protegerPaginasPrivadas
} from "./auth.js?v=20260721-2";
import { initBriefing } from "./briefing.js?v=20260721-4";
import { initComments } from "./comments.js?v=20260721-4";
import { initDashboard } from "./dashboard.js?v=20260721-4";
import { initRealtime } from "./realtime.js";
import { initUploads } from "./uploads.js?v=20260721-4";
import { exposePublicFunctions } from "./utils.js";
import {
  initVouchers,
  ativarBotoesVoucherAdmin,
  carregarAdminVouchers,
  carregarVouchers,
  gerarCodigoVoucher,
  validarVoucher
} from "./vouchers.js";
import {
  carregarAdminReal,
  carregarAdminClientes,
  carregarAdminProjetos,
  carregarCardsAdmin,
  ativarAcoesAdmin,
  aplicarFiltrosAdmin,
  mostrarSecaoEmBreve
} from "./admin.js?v=20260721-4";
import {
  buscarBriefingAtualCliente,
  carregarComentariosAdmin,
  carregarComentariosProjeto
} from "./comments.js?v=20260721-4";
import {
  abrirPreviewArquivo,
  ativarBotoesAdminUploads,
  carregarAdminUploads,
  carregarUploadsCliente,
  mostrarArquivos
} from "./uploads.js?v=20260721-4";
import {
  abrirModalBriefing,
  carregarDashboard,
  carregarProgressoProjeto,
  carregarSidebarUser,
  carregarTimelineProjeto
} from "./dashboard.js?v=20260721-4";
import {
  iniciarRealtimeAdmin,
  iniciarRealtimeCliente,
  iniciarRealtimeComentariosCliente
} from "./realtime.js";
import {
  carregarNotificacoes,
  mostrarToast
} from "./notifications.js";

function inicializarSistema() {
  exposePublicFunctions({
    abrirModalBriefing,
    abrirPreviewArquivo,
    aplicarFiltrosAdmin,
    ativarAcoesAdmin,
    ativarBotoesAdminUploads,
    ativarBotoesVoucherAdmin,
    buscarBriefingAtualCliente,
    carregarAdminClientes,
    carregarAdminProjetos,
    carregarAdminReal,
    carregarAdminUploads,
    carregarAdminVouchers,
    carregarCardsAdmin,
    carregarComentariosAdmin,
    carregarComentariosProjeto,
    carregarDashboard,
    carregarNotificacoes,
    carregarProgressoProjeto,
    carregarSidebarUser,
    carregarTimelineProjeto,
    carregarUploadsCliente,
    carregarVouchers,
    gerarCodigoVoucher,
    iniciarRealtimeAdmin,
    iniciarRealtimeCliente,
    iniciarRealtimeComentariosCliente,
    mostrarArquivos,
    mostrarSecaoEmBreve,
    mostrarToast,
    protegerAdmin,
    protegerPaginasPrivadas,
    validarVoucher
  });

  initAuth();
  initDashboard();
  initVouchers();
  initBriefing();
  initAdmin();
  initUploads();
  initComments();
  initRealtime();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    inicializarSistema
  );
} else {
  inicializarSistema();
}
