export function getSupabase() {
  if (!window.supabaseClient) {
    throw new Error("Supabase nao foi carregado.");
  }

  return window.supabaseClient;
}

export async function getCurrentSession() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;
  return data.session;
}

export async function fetchAdminProfile(userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("id", userId)
    .eq("status", "active")
    .single();

  if (error) throw error;
  return data;
}
