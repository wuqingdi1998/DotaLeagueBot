import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDiscordSupporters } from "./discord-supporters";

const originalDiscordToken = process.env.DISCORD_TOKEN;
const originalGuildId = process.env.GUILD_ID;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalDiscordToken === undefined) delete process.env.DISCORD_TOKEN;
  else process.env.DISCORD_TOKEN = originalDiscordToken;
  if (originalGuildId === undefined) delete process.env.GUILD_ID;
  else process.env.GUILD_ID = originalGuildId;
});

describe("Boosty supporter directory", () => {
  it("returns non-bot members with the supporter role in name order", async () => {
    process.env.DISCORD_TOKEN = "test-bot-token";
    process.env.GUILD_ID = "123456789";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json([
          {
            nick: "Ян",
            roles: ["1506420703254286478"],
            user: { id: "3", username: "yan", avatar: "avatar-three" },
          },
          {
            roles: ["1506420703254286478"],
            user: { id: "2", username: "bot", bot: true },
          },
          {
            roles: ["another-role"],
            user: { id: "4", username: "without-role" },
          },
          {
            roles: ["1506420703254286478"],
            user: {
              id: "1",
              username: "anna",
              global_name: "Анна",
              avatar: null,
            },
          },
        ]),
      ),
    );

    await expect(loadDiscordSupporters()).resolves.toEqual([
      { discordId: "1", name: "Анна", avatarUrl: null },
      {
        discordId: "3",
        name: "Ян",
        avatarUrl: "https://cdn.discordapp.com/avatars/3/avatar-three.webp?size=128",
      },
    ]);
  });

  it("reports unavailable Discord configuration without making a request", async () => {
    delete process.env.DISCORD_TOKEN;
    delete process.env.GUILD_ID;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadDiscordSupporters()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
