import { el } from "./ui.js";

export function initSettings() {
  const root = document.getElementById("settingsRoot");
  if (!root) return;

  root.textContent = "";
  root.appendChild(el("section", { className: "admin-card full" }, [
    el("h2", { text: "Configuracoes" }),
    el("p", {
      className: "admin-muted",
      text: "Fundacao preparada para parametros administrativos. Nesta etapa nao foram implementadas configuracoes operacionais avancadas."
    })
  ]));
}
