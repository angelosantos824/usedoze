import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
    SUPABASE_URL,
    SUPABASE_ANON_KEY
} from "../../../studio/config.js";

let supabaseClient = null;

export function getSupabase() {

    if (!supabaseClient) {

        supabaseClient = createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY,
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

    const { data, error } =
        await supabase.auth.getSession();

    if (error) throw error;

    return data.session;

}

export async function fetchAdminProfile(userId) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from("admin_profiles")
        .select("*")
        .eq("auth_user_id", userId)
        .eq("status", "active")
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        throw new Error("Perfil administrativo ativo não encontrado.");
    }

    return data;
}