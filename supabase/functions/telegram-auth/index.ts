import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

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

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "apikey, x-client-info, content-type, authorization",
    "Content-Type": "application/json",
  };
}

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

// Generate a cryptographically random one-time password. We set it on the
// auth.users row right before signInWithPassword and never persist it. This
// avoids the risk of a deterministic password being computable from a leaked
// BOT_TOKEN.
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

serve(async (req: Request) => {
  if (!BOT_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: TELEGRAM_BOT_TOKEN missing" }),
      { status: 500, headers: corsHeaders() }
    );
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: corsHeaders() });
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
        return new Response(JSON.stringify({ error: validation.error ?? "Invalid initData" }), { status: 401, headers: corsHeaders() });
      }

      const params = parseQueryString(body.initData);
      const userStr = params.user;
      if (!userStr) {
        return new Response(JSON.stringify({ error: "No user in initData" }), { status: 400, headers: corsHeaders() });
      }

      const user: TelegramUser = JSON.parse(userStr);
      const result = await authenticateUser(user, supabase);
      if (!result) {
        return new Response(JSON.stringify({ error: "Authentication failed" }), { status: 500, headers: corsHeaders() });
      }
      return new Response(JSON.stringify(result), { headers: corsHeaders() });
    }

    // Path 2: Login Widget (authData format — flat key=value pairs)
    if (body.authData) {
      const validation = await validateLoginWidgetAuth(body.authData);
      if (!validation.valid) {
        return new Response(JSON.stringify({ error: validation.error ?? "Invalid authData" }), { status: 401, headers: corsHeaders() });
      }

      const params = parseQueryString(body.authData);
      const user: TelegramUser = {
        id: Number(params.id),
        first_name: params.first_name,
        last_name: params.last_name,
        username: params.username,
        photo_url: params.photo_url,
      };

      const result = await authenticateUser(user, supabase);
      if (!result) {
        return new Response(JSON.stringify({ error: "Authentication failed" }), { status: 500, headers: corsHeaders() });
      }
      return new Response(JSON.stringify(result), { headers: corsHeaders() });
    }

    return new Response(JSON.stringify({ error: "initData or authData is required" }), { status: 400, headers: corsHeaders() });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders() }
    );
  }
});
