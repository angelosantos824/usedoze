export function mostrarToast(mensagem, tipo = "info") {
  const toastContainer =
    document.getElementById("toastContainer");

  if (!toastContainer) return;

  const toast =
    document.createElement("div");

  toast.classList.add("toast", tipo);
  toast.textContent = mensagem;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";

    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

const carregarNotificacoesExterna =
  window.carregarNotificacoes;

export function carregarNotificacoes() {
  if (typeof carregarNotificacoesExterna === "function") {
    carregarNotificacoesExterna();
  }
}
