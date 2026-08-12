import { afterEach, describe, expect, it, vi } from "vitest";
import { checkDiscordServerMembership } from "./discord-server-membership";

const originalDiscordToken = process.env.DISCORD_TOKEN;
const originalGuildId = process.env.GUILD_ID;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalDiscordToken === undefined) delete process.env.DISCORD_TOKEN;
  else process.env.DISCORD_TOKEN = originalDiscordToken;
  if (originalGuildId === undefined) delete process.env.GUILD_ID;
  else process.env.GUILD_ID = originalGuildId;
});

function configureDiscord() {
  process.env.DISCORD_TOKEN = "test-bot-token";
  process.env.GUILD_ID = "123456789";
}

describe("Discord server membership", () => {
  it("recognizes a current server member", async () => {
    configureDiscord();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkDiscordServerMembership("987654321")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://discord.com/api/v10/guilds/123456789/members/987654321",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("recognizes Discord's exact unknown-member response", async () => {
    configureDiscord();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({ code: 10007 }, { status: 404 }),
      ),
    );

    await expect(checkDiscordServerMembership("987654321")).resolves.toBe(false);
  });

  it("does not report a missing member on configuration or Discord errors", async () => {
    delete process.env.DISCORD_TOKEN;
    process.env.GUILD_ID = "123456789";
    await expect(checkDiscordServerMembership("987654321")).resolves.toBeNull();

    configureDiscord();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({ code: 10004 }, { status: 404 }),
      ),
    );
    await expect(checkDiscordServerMembership("987654321")).resolves.toBeNull();
  });
});
