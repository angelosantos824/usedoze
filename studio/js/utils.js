export function paginaAtual() {
  return window.location.pathname.split("/").pop();
}

export function isPagina(nome) {
  return window.location.pathname.includes(nome);
}

export function getSupabase() {
  return window.supabaseClient || globalThis.supabaseClient;
}

export function exposePublicFunctions(functions) {
  Object.assign(window, functions);
}
