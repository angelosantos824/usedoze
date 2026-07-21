const SUPABASE_URL =
  "https://crbxqjxpghgfqkibudlz.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyYnhxanhwZ2hnZnFraWJ1ZGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjIxNjgsImV4cCI6MjA5NTYzODE2OH0.snvXPWCpKEwBB2Mtc1U55FSO7kh5ZH0bHMlGmM_EWpc";

const TURNSTILE_SITE_KEY = "0x4AAAAAAD4lG3sDlglBYxse";

globalThis.DOZEDEV_CONFIG = {
  turnstileSiteKey: TURNSTILE_SITE_KEY
};

globalThis.SUPABASE_URL = SUPABASE_URL;
globalThis.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

const supabaseClient = globalThis.supabase?.createClient
  ? globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : undefined;

globalThis.supabaseClient = supabaseClient;
