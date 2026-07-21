import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://dozedev.pt",
  "https://www.dozedev.pt",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);

const allowedRedirects = new Set([
  "https://dozedev.pt/studio/login.html",
  "https://www.dozedev.pt/studio/login.html",
  "http://127.0.0.1:5173/studio/login.html",
  "http://localhost:5173/studio/login.html",
]);

const baseCorsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const resendAttempts = new Map<string, number>();
const rateLimitMs = 15 * 60 * 1000;

type ResendPayload = {
  email?: string;
};

function corsHeadersFor(request: Request) {
  const origin = request.headers.get("origin");
  const headers = { ...baseCorsHeaders };

  if (origin && allowedOrigins.has(origin)) {
    return {
      ...headers,
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
    };
  }

  return headers;
}

function jsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(request),
      "Content-Type": "application/json",
    },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function genericResponse(request: Request) {
  return jsonResponse(request, {
    message:
      "Se existir uma conta pendente para este email, enviaremos uma nova confirmação.",
  });
}

function sanitizeIp(value: string | null) {
  if (!value) return "unknown";

  const ip = value.trim();
  const ipv4 =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const ipv6 = /^[0-9a-f:]+$/i;

  return ipv4.test(ip) || (ip.includes(":") && ipv6.test(ip)) ? ip : "unknown";
}

function redirectToFor(request: Request) {
  const configured = Deno.env.get("STUDIO_EMAIL_REDIRECT_TO")?.trim();
  if (configured && allowedRedirects.has(configured)) return configured;

  const origin = request.headers.get("origin");
  const candidate = origin ? `${origin}/studio/login.html` : "";
  if (allowedRedirects.has(candidate)) return candidate;

  return "https://dozedev.pt/studio/login.html";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const lastAttempt = resendAttempts.get(key);

  if (lastAttempt && now - lastAttempt < rateLimitMs) {
    return true;
  }

  resendAttempts.set(key, now);
  return false;
}

async function findAuthUserByEmail(supabase: any, email: string) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) throw error;

  return data.users.find((user: { email?: string }) =>
    normalizeEmail(user.email || "") === email
  ) || null;
}

async function logAudit(
  supabase: any,
  params: {
    action: string;
    email: string;
    ip: string;
    userAgent: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    await supabase.from("audit_logs").insert({
      entity_type: "studio_registration",
      entity_id: params.entityId || null,
      action: params.action,
      metadata: {
        email: params.email,
        ...(params.metadata || {}),
      },
      ip: params.ip === "unknown" ? null : params.ip,
      user_agent: params.userAgent,
    });
  } catch {
    // Audit is best-effort for resend attempts.
  }
}

serve(async (request) => {
  const headers = corsHeadersFor(request);
  const origin = request.headers.get("origin");

  if (origin && !allowedOrigins.has(origin)) {
    return new Response("Forbidden", { status: 403, headers });
  }

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Metodo nao permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return genericResponse(request);
  }

  let payload: ResendPayload;
  try {
    payload = await request.json();
  } catch {
    return genericResponse(request);
  }

  const email = payload.email ? normalizeEmail(payload.email) : "";
  if (!email || !email.includes("@") || email.length > 254) {
    return genericResponse(request);
  }

  const ip = sanitizeIp(
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("cf-connecting-ip"),
  );
  const userAgent = request.headers.get("user-agent");
  const rateLimitKey = `${ip}:${email}`;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  if (isRateLimited(rateLimitKey)) {
    await logAudit(supabase, {
      action: "confirmation_resend_rate_limited",
      email,
      ip,
      userAgent,
    });
    return genericResponse(request);
  }

  try {
    const user = await findAuthUserByEmail(supabase, email);

    if (!user) {
      await logAudit(supabase, {
        action: "confirmation_resend_no_account",
        email,
        ip,
        userAgent,
      });
      return genericResponse(request);
    }

    if (user.email_confirmed_at) {
      await logAudit(supabase, {
        action: "confirmation_resend_already_confirmed",
        email,
        ip,
        userAgent,
        entityId: user.id,
      });
      return genericResponse(request);
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: redirectToFor(request),
      },
    });

    if (error) {
      await logAudit(supabase, {
        action: "confirmation_resend_failed",
        email,
        ip,
        userAgent,
        entityId: user.id,
        metadata: {
          reason: error.message,
        },
      });
      return genericResponse(request);
    }

    await logAudit(supabase, {
      action: "confirmation_resend_sent",
      email,
      ip,
      userAgent,
      entityId: user.id,
    });
  } catch (error) {
    await logAudit(supabase, {
      action: "confirmation_resend_error",
      email,
      ip,
      userAgent,
      metadata: {
        reason: error instanceof Error ? error.message : String(error),
      },
    });
  }

  return genericResponse(request);
});
