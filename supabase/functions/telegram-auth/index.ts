import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

interface InitDataUser {
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

function parseInitData(initData: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of initData.split("&")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx);
    const value = pair.slice(idx + 1);
    map[key] = decodeURIComponent(value);
  }
  return map;
}

async function validateInitData(initData: string): Promise<boolean> {
  const params = parseInitData(initData);
  const hash = params.hash;
  delete params.hash;

  const checkString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("\n");

  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const botTokenKey = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    encoder.encode(BOT_TOKEN)
  );
  const finalKey = await crypto.subtle.importKey(
    "raw",
    botTokenKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    finalKey,
    encoder.encode(checkString)
  );

  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hex === hash;
}

/** Детерминированный пароль — только Edge Function знает BOT_TOKEN */
async function derivePassword(telegramId: number, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(String(telegramId))
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: corsHeaders() });
  }

  try {
    const { initData } = await req.json();

    if (!initData) {
      return new Response(JSON.stringify({ error: "initData is required" }), { status: 400, headers: corsHeaders() });
    }

    const valid = await validateInitData(initData);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid initData" }), { status: 401, headers: corsHeaders() });
    }

    const params = parseInitData(initData);
    const userStr = params.user;
    if (!userStr) {
      return new Response(JSON.stringify({ error: "No user in initData" }), { status: 400, headers: corsHeaders() });
    }

    const user: InitDataUser = JSON.parse(userStr);
    const email = `tg_${user.id}@telegram.local`;
    const password = await derivePassword(user.id, BOT_TOKEN);

    const supabase = createClient(
      Deno.env.get("SB_URL")!,
      Deno.env.get("SB_SERVICE_ROLE_KEY")!
    );

    // 1. Проверить, есть ли уже пользователь с таким telegram_id
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(
      (u) => u.user_metadata?.telegram_id === user.id
    );

    let authUserId: string;

    if (existing) {
      authUserId = existing.id;
      // Миграция: обновляем пароль на актуальный (на случай если раньше был случайный)
      const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, {
        password,
        email_confirm: true,
      });
      if (updateErr) {
        console.error("updateUser password error:", updateErr);
      }
    } else {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
        user_metadata: {
          telegram_id: user.id,
          first_name: user.first_name ?? "",
          username: user.username ?? "",
        },
      });

      if (createErr || !newUser?.user) {
        console.error("createUser error:", createErr);
        return new Response(
          JSON.stringify({ error: "Failed to create user" }),
          { status: 500, headers: corsHeaders() }
        );
      }
      authUserId = newUser.user.id;
    }

    // 2. Upsert профиля
    await supabase.from("profiles").upsert({
      id: authUserId,
      telegram_id: user.id,
      username: user.username ?? null,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      photo_url: user.photo_url ?? null,
    });

    // 3. Авторизоваться — получаем валидную сессию
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr || !signInData.session) {
      console.error("signIn error:", signInErr);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 500, headers: corsHeaders() }
      );
    }

    return new Response(
      JSON.stringify({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_in: signInData.session.expires_in,
        profile_id: authUserId,
        telegram_id: user.id,
        first_name: user.first_name,
        username: user.username,
      }),
      { headers: corsHeaders() }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders() }
    );
  }
});
