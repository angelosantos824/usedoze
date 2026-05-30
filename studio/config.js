const SUPABASE_URL =
  "https://crbxqjxpghgfqkibudlz.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyYnhxanhwZ2hnZnFraWJ1ZGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjIxNjgsImV4cCI6MjA5NTYzODE2OH0.snvXPWCpKEwBB2Mtc1U55FSO7kh5ZH0bHMlGmM_EWpc";

const supabaseClient = window.supabase.createClient(
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

console.log("Supabase conectado:", supabaseClient);