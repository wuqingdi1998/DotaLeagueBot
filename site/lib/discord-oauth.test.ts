import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDiscordIdentity } from "./discord-oauth";

const input = {
  clientId: "client",
  clientSecret: "secret",
  code: "code",
  redirectUri: "https://example.com/api/auth/callback",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Discord OAuth requests", () => {
  it("returns a Discord identity after two successful requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "123",
            username: "player",
            global_name: "Игрок",
            avatar: "avatar",
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchDiscordIdentity(input)).resolves.toEqual({
      id: "123",
      username: "player",
      globalName: "Игрок",
      avatar: "avatar",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a controlled failure when Discord is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(fetchDiscordIdentity(input)).resolves.toBeNull();
  });

  it("returns a controlled failure for an invalid Discord response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>", { status: 502 })),
    );

    await expect(fetchDiscordIdentity(input)).resolves.toBeNull();
  });
});
