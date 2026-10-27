const MAX_BODY_BYTES = 12_000;
const ALLOWED_YEARS = new Set(["First year", "Second year", "Third year", "Master's"]);
const ALLOWED_DEPARTMENTS = new Set(["Technical", "Marketing", "Communication"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sendJson(response, status, payload) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  return response.status(status).json(payload);
}

function getRequestHost(request) {
  const forwardedHost = request.headers["x-forwarded-host"];
  return String(Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || request.headers.host || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

function hasValidOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;

  try {
    return new URL(origin).host.toLowerCase() === getRequestHost(request);
  } catch {
    return false;
  }
}

function getClientIp(request) {
  const forwardedFor = request.headers["x-vercel-forwarded-for"] || request.headers["x-forwarded-for"];
  const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return String(raw || request.socket?.remoteAddress || "").split(",")[0].trim();
}

function parseBody(request) {
  if (typeof request.body === "string") return JSON.parse(request.body);
  return request.body;
}

function normalizeApplication(body) {
  return {
    name: typeof body?.name === "string" ? body.name.trim() : "",
    email: typeof body?.email === "string" ? body.email.trim().toLowerCase() : "",
    year: typeof body?.year === "string" ? body.year : "",
    field: typeof body?.field === "string" ? body.field.trim() : "",
    department: typeof body?.department === "string" ? body.department : "",
    motivation: typeof body?.motivation === "string" ? body.motivation.trim() : "",
    website: typeof body?.website === "string" ? body.website : "",
    turnstileToken: typeof body?.turnstileToken === "string" ? body.turnstileToken : "",
  };
}

function isValidApplication(application) {
  return application.name.length >= 1
    && application.name.length <= 120
    && application.email.length >= 3
    && application.email.length <= 320
    && EMAIL_PATTERN.test(application.email)
    && ALLOWED_YEARS.has(application.year)
    && application.field.length >= 1
    && application.field.length <= 160
    && ALLOWED_DEPARTMENTS.has(application.department)
    && (application.motivation.length === 0
      || (application.motivation.length >= 20 && application.motivation.length <= 5000))
    && application.website.length <= 500;
}

async function verifyTurnstile(token, clientIp, secret) {
  const body = new URLSearchParams({ secret, response: token });
  if (clientIp) body.set("remoteip", clientIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true;
}

function getSupabaseError(status, payload) {
  if (status === 429 || payload?.code === "RATE_LIMITED") {
    return { status: 429, message: "Too many applications were sent. Please wait before trying again." };
  }
  if (status === 400 || payload?.code === "22023" || payload?.code === "23514") {
    return { status: 400, message: "Please check your answers and try again." };
  }
  if (status === 409 || payload?.code === "23505") {
    return { status: 409, message: "An application with these details has already been submitted." };
  }
  return { status: 503, message: "The application service is temporarily unavailable. Please try again later." };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  if (!hasValidOrigin(request)) {
    return sendJson(response, 403, { error: "Request origin was rejected." });
  }

  const contentLength = Number(request.headers["content-length"] || 0);
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    return sendJson(response, 413, { error: "Request is too large." });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim().replace(/\/+$/, "");
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!supabaseUrl || !supabaseSecretKey || !turnstileSecretKey) {
    return sendJson(response, 503, { error: "Applications are temporarily unavailable. Please try again later." });
  }

  let configuredUrl;
  try {
    configuredUrl = new URL(supabaseUrl);
  } catch {
    return sendJson(response, 503, { error: "Applications are temporarily unavailable. Please try again later." });
  }
  if (configuredUrl.protocol !== "https:") {
    return sendJson(response, 503, { error: "Applications are temporarily unavailable. Please try again later." });
  }

  let application;
  try {
    application = normalizeApplication(parseBody(request));
  } catch {
    return sendJson(response, 400, { error: "Invalid request body." });
  }

  if (!isValidApplication(application)) {
    return sendJson(response, 400, { error: "Please check your answers and try again." });
  }

  // Return a generic success for honeypot submissions without touching Supabase.
  if (application.website.trim()) {
    return sendJson(response, 200, { accepted: true });
  }

  const clientIp = getClientIp(request);
  let challengePassed = false;
  try {
    challengePassed = await verifyTurnstile(application.turnstileToken, clientIp, turnstileSecretKey);
  } catch {
    return sendJson(response, 503, { error: "Verification is temporarily unavailable. Please try again." });
  }
  if (!challengePassed) {
    return sendJson(response, 403, { error: "Please complete the security check and try again." });
  }

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(`${configuredUrl.toString().replace(/\/$/, "")}/rest/v1/rpc/submit_club_application_secure`, {
      method: "POST",
      headers: {
        apikey: supabaseSecretKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_full_name: application.name,
        p_email: application.email,
        p_study_year: application.year,
        p_field_of_study: application.field,
        p_department: application.department,
        p_motivation: application.motivation || null,
        p_website: application.website,
        p_client_ip: clientIp,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return sendJson(response, 503, { error: "Could not reach the application service. Please try again." });
  }

  const upstreamPayload = await upstreamResponse.json().catch(() => null);
  if (!upstreamResponse.ok) {
    const safeError = getSupabaseError(upstreamResponse.status, upstreamPayload);
    return sendJson(response, safeError.status, { error: safeError.message });
  }

  return sendJson(response, 200, { accepted: true });
}
