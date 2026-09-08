import { describe, expect, it } from "vitest";
import {
  compactDiscordAvatarUrl,
  discordAvatarCacheKey,
  resilientAvatarUrl,
} from "./avatar-url";

describe("compact Discord avatar URL", () => {
  it("requests a small static image instead of a large animated avatar", () => {
    expect(
      compactDiscordAvatarUrl(
        "https://cdn.discordapp.com/avatars/100/a_hash.gif?size=1024",
      ),
    ).toBe("https://cdn.discordapp.com/avatars/100/a_hash.png?size=128");
  });

  it("reduces regular and server-specific Discord avatars", () => {
    expect(
      compactDiscordAvatarUrl(
        "https://cdn.discordapp.com/avatars/100/hash.png?size=1024",
      ),
    ).toBe("https://cdn.discordapp.com/avatars/100/hash.png?size=128");
    expect(
      compactDiscordAvatarUrl(
        "https://cdn.discordapp.com/guilds/1/users/2/avatars/hash.webp",
      ),
    ).toBe(
      "https://cdn.discordapp.com/guilds/1/users/2/avatars/hash.webp?size=128",
    );
  });

  it("leaves non-Discord images unchanged", () => {
    expect(compactDiscordAvatarUrl("https://example.com/avatar.gif?size=1024"))
      .toBe("https://example.com/avatar.gif?size=1024");
  });

  it("routes Discord images through the site without changing other hosts", () => {
    expect(
      resilientAvatarUrl(
        "https://cdn.discordapp.com/avatars/100/hash.png?size=1024",
      ),
    ).toBe(
      "/api/discord-avatars?source=https%3A%2F%2Fcdn.discordapp.com%2Favatars%2F100%2Fhash.png%3Fsize%3D128",
    );
    expect(resilientAvatarUrl("https://example.com/avatar.png")).toBe(
      "https://example.com/avatar.png",
    );
  });

  it("uses one stable cache key when a player changes avatar type", () => {
    expect(
      discordAvatarCacheKey(
        "https://cdn.discordapp.com/avatars/100/hash.png?size=128",
      ),
    ).toBe("user-100");
    expect(
      discordAvatarCacheKey(
        "https://media.discordapp.net/guilds/5/users/100/avatars/server.webp",
      ),
    ).toBe("user-100");
    expect(discordAvatarCacheKey("https://example.com/avatar.png")).toBeNull();
  });
});
