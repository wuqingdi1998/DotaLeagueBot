import { describe, expect, it } from "vitest";
import { compactDiscordAvatarUrl } from "./avatar-url";

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
});
