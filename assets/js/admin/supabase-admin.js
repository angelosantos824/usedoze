let supabaseClient = null;

export function getSupabase() {
  if (!supabaseClient) {
    if (globalThis.supabaseClient) {
      supabaseClient = globalThis.supabaseClient;
      return supabaseClient;
    }

    if (!globalThis.supabase?.createClient) {
      throw new Error("Supabase nao carregou.");
    }

    supabaseClient = globalThis.supabase.createClient(
      globalThis.SUPABASE_URL,
      globalThis.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }

  return supabaseClient;
}

export async function getCurrentSession() {
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function fetchAdminProfile(userId) {
  if (!userId) {
    throw new Error("Utilizador autenticado não informado.");
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("auth_user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    error.code = error.code || "ADMIN_PROFILE_LOAD_FAILED";
    throw error;
  }

  if (!data) {
    const profileError = new Error("Perfil administrativo ativo nao encontrado.");
    profileError.code = "ADMIN_PROFILE_NOT_FOUND";
    throw profileError;
  }

  if (data.role !== "super_admin") {
    const permissionError = new Error("O utilizador nao possui permissao de Super Administrador.");
    permissionError.code = "ADMIN_PROFILE_FORBIDDEN";
    throw permissionError;
  }

  return data;
}
