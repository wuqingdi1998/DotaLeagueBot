import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDiscordAvatar } from "./discord-avatar-cache";

const temporaryDirectories: string[] = [];

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), "discord-avatar-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("Discord avatar cache", () => {
  it("downloads an avatar once and then serves the saved copy", async () => {
    const cacheDirectory = await temporaryDirectory();
    const fetchImage = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/png" },
      }),
    );
    const source =
      "https://cdn.discordapp.com/avatars/100/first.png?size=128";

    const downloaded = await loadDiscordAvatar(source, {
      cacheDirectory,
      fetchImage,
    });
    const cached = await loadDiscordAvatar(source, {
      cacheDirectory,
      fetchImage,
    });

    expect(downloaded?.state).toBe("refreshed");
    expect(cached?.state).toBe("cached");
    expect(Array.from(cached?.body ?? [])).toEqual([1, 2, 3]);
    expect(fetchImage).toHaveBeenCalledTimes(1);
  });

  it("keeps the last working image when a changed avatar cannot download", async () => {
    const cacheDirectory = await temporaryDirectory();
    const firstSource =
      "https://cdn.discordapp.com/avatars/200/first.png?size=128";
    const changedSource =
      "https://cdn.discordapp.com/avatars/200/changed.png?size=128";
    const fetchImage = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([4, 5, 6]), {
          headers: { "content-type": "image/png" },
        }),
      )
      .mockRejectedValueOnce(new Error("Discord unavailable"));

    await loadDiscordAvatar(firstSource, { cacheDirectory, fetchImage });
    const stale = await loadDiscordAvatar(changedSource, {
      cacheDirectory,
      fetchImage,
    });
    const backoff = await loadDiscordAvatar(changedSource, {
      cacheDirectory,
      fetchImage,
    });

    expect(stale?.state).toBe("stale");
    expect(backoff?.state).toBe("stale");
    expect(Array.from(stale?.body ?? [])).toEqual([4, 5, 6]);
    expect(fetchImage).toHaveBeenCalledTimes(2);
  });

  it("replaces the saved copy only after a valid changed image downloads", async () => {
    const cacheDirectory = await temporaryDirectory();
    const firstSource =
      "https://cdn.discordapp.com/avatars/300/first.png?size=128";
    const changedSource =
      "https://cdn.discordapp.com/avatars/300/changed.png?size=128";
    const fetchImage = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([7, 8]), {
          headers: { "content-type": "image/png" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("not an image", {
          headers: { "content-type": "text/html" },
        }),
      );

    await loadDiscordAvatar(firstSource, { cacheDirectory, fetchImage });
    const stale = await loadDiscordAvatar(changedSource, {
      cacheDirectory,
      fetchImage,
    });

    expect(stale?.state).toBe("stale");
    expect(Array.from(stale?.body ?? [])).toEqual([7, 8]);
  });

  it("does not contact or cache untrusted image hosts", async () => {
    const cacheDirectory = await temporaryDirectory();
    const fetchImage = vi.fn();

    const result = await loadDiscordAvatar("https://example.com/avatar.png", {
      cacheDirectory,
      fetchImage,
    });

    expect(result).toBeNull();
    expect(fetchImage).not.toHaveBeenCalled();
  });
});
