import { NextResponse } from "next/server";
import { consumeOauthState, createSession } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { cleanDiscordRedirect } from "@/lib/validation";

type DiscordToken = {
  access_token?: string;
};

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

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
    return NextResponse.redirect(`${baseUrl}/?authError=config`);
  }

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${baseUrl}/api/auth/callback`,
    }),
    cache: "no-store",
  });
  const token = (await tokenResponse.json()) as DiscordToken;
  if (!tokenResponse.ok || !token.access_token) {
    return NextResponse.redirect(`${baseUrl}/?authError=discord`);
  }

  const userResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  const discordUser = (await userResponse.json()) as DiscordUser;
  if (!userResponse.ok || !discordUser.id) {
    return NextResponse.redirect(`${baseUrl}/?authError=discord`);
  }

  const player = await one<{ discord_id: string }>(
    "SELECT discord_id::text FROM players WHERE discord_id = $1",
    [discordUser.id],
  );
  if (!player) {
    return NextResponse.redirect(`${baseUrl}/?authError=not_registered`);
  }

  const bootstrapAdmins = new Set(
    (process.env.BOOTSTRAP_ADMIN_DISCORD_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  if (bootstrapAdmins.has(discordUser.id)) {
    await query(
      `INSERT INTO site_admins(discord_id)
       VALUES ($1) ON CONFLICT (discord_id) DO NOTHING`,
      [discordUser.id],
    );
  }

  const avatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
    : null;
  await createSession({
    discordId: discordUser.id,
    username: discordUser.global_name || discordUser.username,
    avatarUrl,
  });

  return NextResponse.redirect(
    `${baseUrl}${cleanDiscordRedirect(returnTo)}`,
  );
}
