import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

interface InitDataUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

function parseInitData(initData: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of initData.split("&")) {
    const [key, value] = pair.split("=");
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

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), { status: 405 });
  }

  try {
    const { initData } = await req.json();

    if (!initData) {
      return new Response(JSON.stringify({ error: "initData is required" }), { status: 400 });
    }

    const valid = await validateInitData(initData);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid initData" }), { status: 401 });
    }

    const params = parseInitData(initData);
    const userStr = params.user;
    if (!userStr) {
      return new Response(JSON.stringify({ error: "No user in initData" }), { status: 400 });
    }

    const user: InitDataUser = JSON.parse(userStr);
    const email = `tg_${user.id}@telegram.local`;

    const supabase = createClient(
      Deno.env.get("SB_URL")!,
      Deno.env.get("SB_SERVICE_ROLE_KEY")!
    );

    // 1. Найти или создать auth.users запись
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(
      (u) => u.user_metadata?.telegram_id === user.id
    );

    let authUserId: string;

    if (existing) {
      authUserId = existing.id;
    } else {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: crypto.randomUUID() + crypto.randomUUID(),
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
          { status: 500 }
        );
      }
      authUserId = newUser.user.id;
    }

    // 2. Upsert в profiles
    await supabase.from("profiles").upsert({
      id: authUserId,
      telegram_id: user.id,
      username: user.username ?? null,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      photo_url: user.photo_url ?? null,
    });

    // 3. Выдать access_token клиенту
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkErr || !linkData?.properties?.access_token) {
      return new Response(
        JSON.stringify({
          profile_id: authUserId,
          telegram_id: user.id,
          first_name: user.first_name,
          username: user.username,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        access_token: linkData.properties.access_token,
        refresh_token: linkData.properties.refresh_token,
        profile_id: authUserId,
        telegram_id: user.id,
        first_name: user.first_name,
        username: user.username,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
});
