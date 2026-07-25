import { NextResponse } from "next/server";
import { cleanDiscordRedirect } from "@/lib/validation";
import { createOauthState } from "@/lib/auth";

export async function GET(request: Request) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const baseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!clientId || !baseUrl) {
    return Response.json(
      { error: "Вход через Discord ещё не настроен администратором сервера" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const returnTo = cleanDiscordRedirect(url.searchParams.get("returnTo"));
  const state = await createOauthState(returnTo);
  const authorize = new URL("https://discord.com/oauth2/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", `${baseUrl}/api/auth/callback`);
  authorize.searchParams.set("scope", "identify");
  authorize.searchParams.set("state", state);

  return NextResponse.redirect(authorize);
}
