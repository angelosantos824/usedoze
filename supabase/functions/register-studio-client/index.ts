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

type RegisterPayload = {
  name?: string;
  email?: string;
  password?: string;
  company?: string;
  phone?: string;
  whatsapp?: string;
  turnstileToken?: string;
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

function redirectToFor(request: Request) {
  const configured = Deno.env.get("STUDIO_EMAIL_REDIRECT_TO")?.trim();
  if (configured && allowedRedirects.has(configured)) return configured;

  const origin = request.headers.get("origin");
  const candidate = origin ? `${origin}/studio/login.html` : "";
  if (allowedRedirects.has(candidate)) return candidate;

  return "https://dozedev.pt/studio/login.html";
}

function getActionLink(data: unknown) {
  const properties = (data as { properties?: Record<string, unknown> })
    ?.properties;
  const direct = data as { action_link?: unknown; actionLink?: unknown };

  return (
    properties?.action_link ||
    properties?.actionLink ||
    direct?.action_link ||
    direct?.actionLink
  ) as string | undefined;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isKnownDuplicateError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("profile already exists") ||
    message.includes("client already exists");
}

function sanitizeIp(value: string | null) {
  if (!value) return null;

  const ip = value.trim();
  const ipv4 =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const ipv6 = /^[0-9a-f:]+$/i;

  return ipv4.test(ip) || (ip.includes(":") && ipv6.test(ip)) ? ip : null;
}

async function findAuthUserByEmail(
  supabase: any,
  email: string,
) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) throw error;

  return data.users.find((user: { email?: string }) =>
    normalizeEmail(user.email || "") === email
  ) || null;
}

async function logRegistrationIssue(
  supabase: any,
  params: {
    action: string;
    entityId?: string | null;
    email: string;
    ip: string | null;
    userAgent: string | null;
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
      ip: params.ip,
      user_agent: params.userAgent,
    });
  } catch {
    // Audit is best-effort for rejected registration attempts.
  }
}

async function sendConfirmationEmail(params: {
  to: string;
  name: string;
  actionLink: string;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  const replyTo = Deno.env.get("EMAIL_REPLY_TO");

  if (!resendApiKey || !from) {
    throw new Error("email provider is not configured");
  }

  const safeName = escapeHtml(params.name);
  const safeActionLink = escapeHtml(params.actionLink);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      reply_to: replyTo || undefined,
      subject: "Confirme o seu email no DOZEDEV Studio",
      html: `
        <!doctype html>
        <html lang="pt-PT">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Confirme o seu email</title>
          </head>
          <body style="margin:0;padding:0;background:#080711;color:#f7f2ff;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;text-size-adjust:100%;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#080711;margin:0;padding:0;">
              <tr>
                <td align="center" style="padding:32px 16px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;margin:0 auto;">
                    <tr>
                      <td align="center" style="padding:0 0 22px;">
                        <div style="font-size:26px;line-height:1;font-weight:700;letter-spacing:0;color:#ffffff;">
                          DOZE<span style="color:#b56cff;">DEV</span>
                        </div>
                        <div style="font-size:13px;line-height:20px;color:#b9a7ff;margin-top:8px;">
                          Studio
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#121022;border:1px solid #32205f;border-radius:18px;padding:34px 28px;box-shadow:0 0 28px rgba(181,108,255,0.22);">
                        <h1 style="margin:0 0 18px;font-size:28px;line-height:34px;font-weight:700;color:#ffffff;">
                          Confirme o seu email
                        </h1>
                        <p style="margin:0 0 14px;font-size:16px;line-height:24px;color:#efe7ff;">
                          Olá, ${safeName}.
                        </p>
                        <p style="margin:0 0 14px;font-size:16px;line-height:24px;color:#d9cdfa;">
                          A sua conta no DOZEDEV Studio foi criada com sucesso.
                        </p>
                        <p style="margin:0 0 28px;font-size:16px;line-height:24px;color:#d9cdfa;">
                          Confirme o seu endereço de email para ativar o acesso à sua área de cliente.
                        </p>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                          <tr>
                            <td align="center" bgcolor="#9f4dff" style="border-radius:10px;background:#9f4dff;">
                              <a href="${safeActionLink}" style="display:inline-block;padding:15px 24px;border-radius:10px;background:#9f4dff;color:#ffffff;font-size:16px;line-height:20px;font-weight:700;text-decoration:none;box-shadow:0 0 18px rgba(159,77,255,0.45);">
                                Confirmar email
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin:0 0 10px;font-size:13px;line-height:20px;color:#bcaee7;">
                          Se o botão não funcionar, copie e cole este link no navegador:
                        </p>
                        <p style="margin:0 0 24px;font-size:13px;line-height:20px;color:#c99cff;word-break:break-all;">
                          <a href="${safeActionLink}" style="color:#c99cff;text-decoration:underline;">${safeActionLink}</a>
                        </p>
                        <div style="border-top:1px solid #2a2148;padding-top:18px;">
                          <p style="margin:0;font-size:13px;line-height:20px;color:#a99bd4;">
                            Se nao solicitou este cadastro, ignore esta mensagem. Por seguranca, nao partilhe este email nem o link de confirmacao.
                          </p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding:22px 12px 0;">
                        <p style="margin:0;font-size:13px;line-height:21px;color:#8f82b7;">
                          DOZEDEV Studio<br>
                          dozedev.pt<br>
                          suporte@dozedev.pt
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `Ola, ${params.name}.

A sua conta no DOZEDEV Studio foi criada com sucesso.

Confirme o seu endereco de email para ativar o acesso a sua area de cliente.

Confirmar email:
${params.actionLink}

Se nao solicitou este cadastro, ignore esta mensagem.

DOZEDEV Studio
dozedev.pt
suporte@dozedev.pt`,
    }),
  });

  if (!response.ok) {
    throw new Error(`email provider rejected request: ${response.status}`);
  }
}

function validatePayload(payload: RegisterPayload) {
  const allowedKeys = new Set([
    "name",
    "email",
    "password",
    "company",
    "phone",
    "whatsapp",
    "turnstileToken",
  ]);
  const unexpectedKey = Object.keys(payload).find((key) =>
    !allowedKeys.has(key)
  );
  if (unexpectedKey) return "Dados de cadastro invalidos.";

  const name = payload.name?.trim() || "";
  const email = payload.email ? normalizeEmail(payload.email) : "";
  const password = payload.password || "";
  const company = payload.company?.trim() || "";
  const phone = payload.phone?.trim() || "";
  const whatsapp = payload.whatsapp?.trim() || "";

  if (!name) return "Informe o nome.";
  if (name.length > 120) return "Nome demasiado longo.";
  if (company.length > 160) return "Nome da empresa demasiado longo.";
  if (phone.length > 40) return "Telefone demasiado longo.";
  if (whatsapp.length > 40) return "WhatsApp demasiado longo.";
  if (!email || !email.includes("@")) return "Informe um email valido.";
  if (email.length > 254) return "Email demasiado longo.";
  if (password.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
  if (password.length > 128) return "Senha demasiado longa.";

  return null;
}

function isSecurityEnabled() {
  return Deno.env.get("TURNSTILE_REQUIRED") === "true";
}

async function validateTurnstile(token: string | undefined, ip: string | null) {
  if (!isSecurityEnabled()) {
    return true;
  }

  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret || !token) {
    return false;
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true;
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
    return jsonResponse(request, {
      error: "Nao foi possivel concluir o cadastro.",
    }, 500);
  }

  let payload: RegisterPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(request, { error: "Pedido invalido." }, 400);
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return jsonResponse(request, { error: validationError }, 400);
  }

  const name = payload.name!.trim();
  const email = normalizeEmail(payload.email!);
  const password = payload.password!;
  const company = payload.company?.trim() || null;
  const phone = payload.phone?.trim() || null;
  const whatsapp = payload.whatsapp?.trim() || null;
  const userAgent = request.headers.get("user-agent");
  const ip = sanitizeIp(
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("cf-connecting-ip"),
  );

  try {
    const turnstileOk = await validateTurnstile(payload.turnstileToken, ip);
    if (!turnstileOk) {
      return jsonResponse(
        request,
        { error: "Protecao de seguranca invalida." },
        403,
      );
    }
  } catch {
    return jsonResponse(request, {
      error: "Nao foi possivel validar a protecao de seguranca.",
    }, 403);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let createdUserId: string | null = null;

  try {
    const existingAuthUser = await findAuthUserByEmail(supabase, email);
    if (existingAuthUser) {
      await logRegistrationIssue(supabase, {
        action: "registration_reconciliation_required",
        entityId: existingAuthUser.id,
        email,
        ip,
        userAgent,
        metadata: {
          reason: "auth_user_exists_without_complete_studio_foundation",
        },
      });

      return jsonResponse(request, {
        error:
          "Este email ja esta cadastrado. Contacte a DOZEDEV para concluir a associacao.",
      }, 409);
    }

    const redirectTo = redirectToFor(request);
    const { data: authData, error: authError } = await supabase.auth.admin
      .generateLink({
        type: "signup",
        email,
        password,
        options: {
          redirectTo,
          data: {
            nome: name,
            company,
          },
        },
      });

    if (authError) {
      return jsonResponse(request, {
        error: "Este email ja esta cadastrado ou nao pode ser utilizado.",
      }, 409);
    }

    if (!authData.user?.id) {
      throw new Error("Utilizador Auth criado sem UUID.");
    }

    const confirmationLink = getActionLink(authData);
    if (!confirmationLink) {
      throw new Error("Link de confirmacao nao foi gerado.");
    }

    createdUserId = authData.user.id;

    const { data, error } = await supabase.rpc("create_studio_client_profile", {
      p_auth_user_id: createdUserId,
      p_name: name,
      p_email: email,
      p_company: company,
      p_phone: phone,
      p_whatsapp: whatsapp,
      p_ip: ip,
      p_user_agent: userAgent,
    });

    if (error) throw error;

    try {
      await sendConfirmationEmail({
        to: email,
        name,
        actionLink: confirmationLink,
      });

      await logRegistrationIssue(supabase, {
        action: "confirmation_email_sent",
        entityId: createdUserId,
        email,
        ip,
        userAgent,
        metadata: {
          source: "register-studio-client",
          redirect_to: redirectTo,
          provider: "resend",
        },
      });
    } catch (emailError) {
      await logRegistrationIssue(supabase, {
        action: "confirmation_email_failed",
        entityId: createdUserId,
        email,
        ip,
        userAgent,
        metadata: {
          source: "register-studio-client",
          redirect_to: redirectTo,
          reason: emailError instanceof Error
            ? emailError.message
            : String(emailError),
        },
      });

      return jsonResponse(request, {
        userId: createdUserId,
        profileId: data?.profile_id,
        clientId: data?.client_id,
        emailSent: false,
        message:
          "Conta criada, mas nao foi possivel enviar o email. Solicite um novo envio.",
      }, 202);
    }

    return jsonResponse(request, {
      userId: createdUserId,
      profileId: data?.profile_id,
      clientId: data?.client_id,
      emailSent: true,
      message:
        "Conta criada com sucesso. Confirme o email para ativar o acesso.",
    });
  } catch (error) {
    if (createdUserId) {
      let compensationStatus = "executed";
      try {
        await supabase.auth.admin.deleteUser(createdUserId);
      } catch {
        compensationStatus = "pending";
        // Compensation failures are intentionally hidden from the user.
      }

      try {
        await logRegistrationIssue(supabase, {
          action: compensationStatus === "executed"
            ? "register_compensated"
            : "register_compensation_pending",
          entityId: createdUserId,
          email,
          ip,
          userAgent,
          metadata: {
            compensation_status: compensationStatus,
            reason: error instanceof Error ? error.message : String(error),
          },
        });
      } catch {
        // Audit best-effort after compensation.
      }
    }

    if (isKnownDuplicateError(error)) {
      return jsonResponse(
        request,
        { error: "Este email ja esta cadastrado." },
        409,
      );
    }

    return jsonResponse(request, {
      error:
        "Nao foi possivel criar a conta. Nenhum acesso parcial foi mantido.",
    }, 500);
  }
});
