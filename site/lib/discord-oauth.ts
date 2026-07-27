const discordRequestTimeoutMs = 10_000;

type DiscordToken = {
  access_token?: string;
};

export type DiscordIdentity = {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
};

export async function fetchDiscordIdentity(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<DiscordIdentity | null> {
  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        grant_type: "authorization_code",
        code: input.code,
        redirect_uri: input.redirectUri,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(discordRequestTimeoutMs),
    });
    if (!tokenResponse.ok) return null;
    const token = (await tokenResponse.json()) as DiscordToken;
    if (!token.access_token) return null;

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(discordRequestTimeoutMs),
    });
    if (!userResponse.ok) return null;
    const discordUser = (await userResponse.json()) as {
      id?: unknown;
      username?: unknown;
      global_name?: unknown;
      avatar?: unknown;
    };
    if (
      typeof discordUser.id !== "string" ||
      !discordUser.id ||
      typeof discordUser.username !== "string" ||
      !discordUser.username
    ) {
      return null;
    }
    return {
      id: discordUser.id,
      username: discordUser.username,
      globalName:
        typeof discordUser.global_name === "string"
          ? discordUser.global_name
          : null,
      avatar:
        typeof discordUser.avatar === "string" ? discordUser.avatar : null,
    };
  } catch {
    return null;
  }
}
