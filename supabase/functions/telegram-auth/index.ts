import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") || "https://ztrainerz.netlify.app")
  .split(",")
  .map(o => o.trim());

if (!BOT_TOKEN) {
  console.error("FATAL: TELEGRAM_BOT_TOKEN is not set in Edge Function secrets");
}

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

// ---------------------------------------------------------------------------
// CORS: allow configured origins + Telegram Web App origins.
// ---------------------------------------------------------------------------
const TELEGRAM_ORIGINS = [
  "https://web.telegram.org",
  "https://webk.telegram.org",
  "https://webz.telegram.org",
];

function corsHeaders(requestOrigin?: string | null) {
  const origin = requestOrigin || ALLOWED_ORIGINS[0];
  const allAllowed = [...ALLOWED_ORIGINS, ...TELEGRAM_ORIGINS];
  const allowedOrigin = allAllowed.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "apikey, x-client-info, content-type, authorization",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  };
}

// Reject requests from disallowed browser origins (preflight already handled).
function isOriginAllowed(requestOrigin: string | null): boolean {
  // Non-browser clients send no Origin header — allow them (they bypass CORS anyway).
  if (!requestOrigin) return true;
  const allAllowed = [...ALLOWED_ORIGINS, ...TELEGRAM_ORIGINS];
  return allAllowed.includes(requestOrigin);
}

// ---------------------------------------------------------------------------
// Replay protection: reject the same (telegram_id, auth_date) pair within
// 5 minutes. This prevents an attacker from re-using a captured initData/
// authData string to mint new sessions. TTL-based in-memory map — Edge
// Functions are short-lived isolates so this is cleaned up automatically.
// ---------------------------------------------------------------------------
const recentAuths = new Map<string, number>(); // key → timestamp
const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function isReplay(telegramId: number, authDate: number): boolean {
  const key = `${telegramId}:${authDate}`;
  const now = Date.now();
  // Lazy cleanup: remove old entries (max once per request, cap at 1000 entries)
  if (recentAuths.size > 1000) {
    for (const [k, ts] of recentAuths) {
      if (now - ts > REPLAY_WINDOW_MS) recentAuths.delete(k);
    }
  }
  if (recentAuths.has(key)) return true;
  recentAuths.set(key, now);
  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseQueryString(data: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of data.split("&")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx);
    const value = pair.slice(idx + 1);
    map[key] = decodeURIComponent(value);
  }
  return map;
}

function buildCheckString(params: Record<string, string>): string {
  const sorted = Object.keys(params).filter(k => k !== "hash").sort();
  return sorted.map(k => `${k}=${params[k]}`).join("\n");
}

async function validateMiniAppInitData(initData: string): Promise<{ valid: boolean; error?: string }> {
  const params = parseQueryString(initData);
  const hash = params.hash;
  if (!hash) return { valid: false, error: "Missing hash" };

  const authDate = Number(params.auth_date);
  if (!authDate) return { valid: false, error: "Missing auth_date" };
  if (Math.floor(Date.now() / 1000) - authDate > 300) {
    return { valid: false, error: "initData expired" };
  }

  const checkString = buildCheckString(params);

  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw", encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const botTokenKey = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(BOT_TOKEN));
  const finalKey = await crypto.subtle.importKey("raw", botTokenKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", finalKey, encoder.encode(checkString));

  const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === hash ? { valid: true } : { valid: false, error: "Invalid signature" };
}

async function validateLoginWidgetAuth(authData: string): Promise<{ valid: boolean; error?: string }> {
  const params = parseQueryString(authData);
  const hash = params.hash;
  if (!hash) return { valid: false, error: "Missing hash" };

  const authDate = Number(params.auth_date);
  if (!authDate) return { valid: false, error: "Missing auth_date" };
  if (Math.floor(Date.now() / 1000) - authDate > 86400) {
    return { valid: false, error: "authData expired" };
  }

  const checkString = buildCheckString(params);

  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw", encoder.encode(BOT_TOKEN),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(checkString));

  const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === hash ? { valid: true } : { valid: false, error: "Invalid signature" };
}

// Generate a cryptographically random one-time password.
function generateOneTimePassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function authenticateUser(user: TelegramUser, supabase: ReturnType<typeof createClient>) {
  const email = `tg_${user.id}@telegram.local`;
  const password = generateOneTimePassword();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_id", user.id)
    .maybeSingle();

  let authUserId: string;

  if (existingProfile) {
    authUserId = existingProfile.id;
    const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
      user_metadata: {
        telegram_id: user.id,
        first_name: user.first_name ?? "",
        username: user.username ?? "",
        photo_url: user.photo_url ?? "",
      },
    });
    if (updateErr) console.error("updateUser error:", updateErr);
  } else {
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: {
        telegram_id: user.id,
        first_name: user.first_name ?? "",
        username: user.username ?? "",
        photo_url: user.photo_url ?? "",
      },
    });

    if (createErr || !newUser?.user) {
      console.error("createUser error:", createErr);
      return null;
    }
    authUserId = newUser.user.id;
  }

  await supabase.from("profiles").upsert({
    id: authUserId,
    telegram_id: user.id,
    username: user.username ?? null,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    photo_url: user.photo_url ?? null,
  });

  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

  if (signInErr || !signInData.session) {
    console.error("signIn error:", signInErr);
    return null;
  }

  return {
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
    expires_in: signInData.session.expires_in,
    profile_id: authUserId,
    telegram_id: user.id,
    first_name: user.first_name,
    username: user.username,
    photo_url: user.photo_url,
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  const reqOrigin = req.headers.get("origin");

  if (!BOT_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: TELEGRAM_BOT_TOKEN missing" }),
      { status: 500, headers: corsHeaders(reqOrigin) }
    );
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(reqOrigin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: corsHeaders(reqOrigin) });
  }

  // Reject cross-origin browser requests from non-allowed domains.
  if (!isOriginAllowed(reqOrigin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403, headers: corsHeaders(reqOrigin) });
  }

  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SB_URL")!,
      Deno.env.get("SB_SERVICE_ROLE_KEY")!
    );

    // Path 1: Mini App (initData format — has nested "user" JSON)
    if (body.initData) {
      const validation = await validateMiniAppInitData(body.initData);
      if (!validation.valid) {
        return new Response(JSON.stringify({ error: validation.error ?? "Invalid initData" }), { status: 401, headers: corsHeaders(reqOrigin) });
      }

      const params = parseQueryString(body.initData);
      const userStr = params.user;
      if (!userStr) {
        return new Response(JSON.stringify({ error: "No user in initData" }), { status: 400, headers: corsHeaders(reqOrigin) });
      }

      const user: TelegramUser = JSON.parse(userStr);

      // Replay protection
      if (isReplay(user.id, Number(params.auth_date))) {
        return new Response(JSON.stringify({ error: "Replay detected" }), { status: 429, headers: corsHeaders(reqOrigin) });
      }

      const result = await authenticateUser(user, supabase);
      if (!result) {
        return new Response(JSON.stringify({ error: "Authentication failed" }), { status: 500, headers: corsHeaders(reqOrigin) });
      }
      return new Response(JSON.stringify(result), { headers: corsHeaders(reqOrigin) });
    }

    // Path 2: Login Widget (authData format — flat key=value pairs)
    if (body.authData) {
      const validation = await validateLoginWidgetAuth(body.authData);
      if (!validation.valid) {
        return new Response(JSON.stringify({ error: validation.error ?? "Invalid authData" }), { status: 401, headers: corsHeaders(reqOrigin) });
      }

      const params = parseQueryString(body.authData);
      const user: TelegramUser = {
        id: Number(params.id),
        first_name: params.first_name,
        last_name: params.last_name,
        username: params.username,
        photo_url: params.photo_url,
      };

      // Replay protection
      if (isReplay(user.id, Number(params.auth_date))) {
        return new Response(JSON.stringify({ error: "Replay detected" }), { status: 429, headers: corsHeaders(reqOrigin) });
      }

      const result = await authenticateUser(user, supabase);
      if (!result) {
        return new Response(JSON.stringify({ error: "Authentication failed" }), { status: 500, headers: corsHeaders(reqOrigin) });
      }
      return new Response(JSON.stringify(result), { headers: corsHeaders(reqOrigin) });
    }

    return new Response(JSON.stringify({ error: "initData or authData is required" }), { status: 400, headers: corsHeaders(reqOrigin) });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders(req.headers.get("origin")) }
    );
  }
});
