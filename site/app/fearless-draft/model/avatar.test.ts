import { describe, expect, it } from "vitest";
import { staticAvatarUrl } from "./avatar";

describe("static draft avatars", () => {
  it("requests a still frame for animated Discord avatars", () => {
    expect(staticAvatarUrl("https://cdn.discordapp.com/a.gif?size=128")).toBe(
      "https://cdn.discordapp.com/a.png?size=128",
    );
    expect(staticAvatarUrl("https://media.discordapp.net/a.webp?format=gif")).toBe(
      "https://media.discordapp.net/a.webp?format=png",
    );
  });

  it("keeps an already static avatar unchanged", () => {
    expect(staticAvatarUrl("https://cdn.discordapp.com/a.png?size=128")).toBe(
      "https://cdn.discordapp.com/a.png?size=128",
    );
  });
});
