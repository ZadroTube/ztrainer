import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Set environment variable before importing index.ts
Deno.env.set("TELEGRAM_BOT_TOKEN", "mock_bot_token");

import {
  parseQueryString,
  buildCheckString,
  validateMiniAppInitData,
  validateLoginWidgetAuth,
} from "./index.ts";

Deno.test("parseQueryString decodes url encoding, Cyrillic, and spaces (+)", () => {
  const input = "first_name=%D0%A4%D0%B8%D0%BB%D0%B8%D0%BF%D0%BF+Smirnov&user_id=123";
  const params = parseQueryString(input);
  assertEquals(params.first_name, "Филипп Smirnov");
  assertEquals(params.user_id, "123");
});

Deno.test("buildCheckString formats and sorts correctly excluding hash", () => {
  const params = {
    c: "3",
    a: "1",
    hash: "abc",
    b: "2",
  };
  const checkString = buildCheckString(params);
  assertEquals(checkString, "a=1\nb=2\nc=3");
});

Deno.test("validateMiniAppInitData validates signature", async () => {
  const authDate = Math.floor(Date.now() / 1000);
  const userJson = '{"id":123,"first_name":"Филипп Смирнов"}';
  
  const params: Record<string, string> = {
    auth_date: String(authDate),
    query_id: "AA",
    user: userJson,
  };
  
  const checkString = buildCheckString(params);
  
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw", encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const botTokenKey = await crypto.subtle.sign("HMAC", secretKey, encoder.encode("mock_bot_token"));
  const finalKey = await crypto.subtle.importKey("raw", botTokenKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", finalKey, encoder.encode(checkString));
  const hash = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");

  // Case A: Space as %20
  const encodedUser20 = encodeURIComponent(userJson);
  const initData20 = `auth_date=${authDate}&query_id=AA&user=${encodedUser20}&hash=${hash}`;
  const validation20 = await validateMiniAppInitData(initData20);
  assertEquals(validation20.valid, true);

  // Case B: Space as +
  const encodedUserPlus = encodeURIComponent(userJson).replace(/%20/g, "+");
  const initDataPlus = `auth_date=${authDate}&query_id=AA&user=${encodedUserPlus}&hash=${hash}`;
  const validationPlus = await validateMiniAppInitData(initDataPlus);
  assertEquals(validationPlus.valid, true);
});

Deno.test("validateLoginWidgetAuth validates widget signature", async () => {
  const authDate = Math.floor(Date.now() / 1000);
  
  const params: Record<string, string> = {
    auth_date: String(authDate),
    first_name: "Филипп Смирнов",
    id: "123",
    username: "phil",
  };
  
  const checkString = buildCheckString(params);
  
  const encoder = new TextEncoder();
  const tokenHash = await crypto.subtle.digest("SHA-256", encoder.encode("mock_bot_token"));
  const secretKey = await crypto.subtle.importKey(
    "raw", tokenHash,
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(checkString));
  const hash = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");

  const authData = `auth_date=${authDate}&first_name=${encodeURIComponent("Филипп Смирнов").replace(/%20/g, "+")}&id=123&username=phil&hash=${hash}`;
  const validation = await validateLoginWidgetAuth(authData);
  assertEquals(validation.valid, true);
});
