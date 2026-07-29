import { NextResponse } from "next/server";
import { consumeOauthState, createSession } from "@/lib/auth";
import { one } from "@/lib/db";
import { cleanDiscordRedirect } from "@/lib/validation";
import { fetchDiscordIdentity } from "@/lib/discord-oauth";

function authErrorRedirect(
  baseUrl: string,
  returnTo: string,
  error: string,
) {
  const target = new URL(cleanDiscordRedirect(returnTo), `${baseUrl}/`);
  target.searchParams.set("authError", error);
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const baseUrl = (
    process.env.PUBLIC_BASE_URL ?? requestUrl.origin
  ).replace(/\/+$/, "");
  const returnTo = await consumeOauthState(requestUrl.searchParams.get("state"));
  const code = requestUrl.searchParams.get("code");
  if (!returnTo || !code) {
    return NextResponse.redirect(`${baseUrl}/?authError=state`);
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return authErrorRedirect(baseUrl, returnTo, "config");
  }

  const discordUser = await fetchDiscordIdentity({
    clientId,
    clientSecret,
    code,
    redirectUri: `${baseUrl}/api/auth/callback`,
  });
  if (!discordUser) {
    return authErrorRedirect(baseUrl, returnTo, "discord");
  }

  const player = await one<{ discord_id: string }>(
    `SELECT discord_id::text
     FROM players
     WHERE discord_id = $1
       AND is_archived = FALSE`,
    [discordUser.id],
  );
  if (!player) {
    return authErrorRedirect(baseUrl, returnTo, "not_registered");
  }

  const avatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
    : null;
  await createSession({
    discordId: discordUser.id,
    username: discordUser.globalName || discordUser.username,
    avatarUrl,
  });

  return NextResponse.redirect(
    `${baseUrl}${cleanDiscordRedirect(returnTo)}`,
  );
}
