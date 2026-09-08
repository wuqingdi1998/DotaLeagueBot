import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { discordAvatarCacheKey } from "./avatar-url";

const retryDelayMilliseconds = 5 * 60 * 1_000;
const maximumAvatarBytes = 2_000_000;
const supportedContentTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type AvatarCacheMetadata = {
  contentType?: string;
  failedSource?: string;
  retryAfter?: number;
  source?: string;
};

export type DiscordAvatarResult = {
  body: Uint8Array;
  contentType: string;
  state: "cached" | "refreshed" | "stale";
};

type AvatarCacheOptions = {
  cacheDirectory: string;
  fetchImage?: typeof fetch;
  now?: () => number;
};

const pendingLoads = new Map<string, Promise<DiscordAvatarResult | null>>();

async function readMetadata(filePath: string) {
  try {
    return JSON.parse(
      await readFile(filePath, "utf8"),
    ) as AvatarCacheMetadata;
  } catch {
    return {};
  }
}

async function readCachedImage(
  imagePath: string,
  metadata: AvatarCacheMetadata,
) {
  if (!metadata.contentType) return null;
  try {
    return {
      body: await readFile(imagePath),
      contentType: metadata.contentType,
    };
  } catch {
    return null;
  }
}

async function replaceFile(filePath: string, content: Uint8Array | string) {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, content);
  await rename(temporaryPath, filePath);
}

async function saveMetadata(
  metadataPath: string,
  metadata: AvatarCacheMetadata,
) {
  await replaceFile(metadataPath, JSON.stringify(metadata));
}

function imageContentType(response: Response) {
  const contentType = response.headers.get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  return contentType && supportedContentTypes.has(contentType)
    ? contentType
    : null;
}

async function refreshDiscordAvatar(
  source: string,
  cacheKey: string,
  options: AvatarCacheOptions,
): Promise<DiscordAvatarResult | null> {
  const currentTime = (options.now ?? Date.now)();
  await mkdir(options.cacheDirectory, { recursive: true });
  const imagePath = path.join(options.cacheDirectory, `${cacheKey}.image`);
  const metadataPath = path.join(options.cacheDirectory, `${cacheKey}.json`);
  const metadata = await readMetadata(metadataPath);
  const cachedImage = await readCachedImage(imagePath, metadata);

  if (cachedImage && metadata.source === source) {
    return { ...cachedImage, state: "cached" };
  }
  if (
    metadata.failedSource === source &&
    (metadata.retryAfter ?? 0) > currentTime
  ) {
    return cachedImage ? { ...cachedImage, state: "stale" } : null;
  }

  try {
    const response = await (options.fetchImage ?? fetch)(source, {
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    const contentType = imageContentType(response);
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (
      !response.ok ||
      !contentType ||
      declaredSize > maximumAvatarBytes
    ) {
      throw new Error(`invalid image response (${response.status})`);
    }
    const body = new Uint8Array(await response.arrayBuffer());
    if (!body.length || body.length > maximumAvatarBytes) {
      throw new Error("invalid image size");
    }
    await replaceFile(imagePath, body);
    await saveMetadata(metadataPath, { contentType, source });
    return { body, contentType, state: "refreshed" };
  } catch (error) {
    console.warn(
      `[AVATARS] Refresh failed for ${cacheKey}: ${String(error)}`,
    );
    try {
      await saveMetadata(metadataPath, {
        ...metadata,
        failedSource: source,
        retryAfter: currentTime + retryDelayMilliseconds,
      });
    } catch (metadataError) {
      console.warn(
        `[AVATARS] Could not save retry state for ${cacheKey}: ${String(metadataError)}`,
      );
    }
    return cachedImage ? { ...cachedImage, state: "stale" } : null;
  }
}

/** Loads a validated Discord image and preserves the last working local copy. */
export async function loadDiscordAvatar(
  source: string,
  options: AvatarCacheOptions,
) {
  const cacheKey = discordAvatarCacheKey(source);
  if (!cacheKey) return null;
  const pending = pendingLoads.get(cacheKey);
  if (pending) return pending;

  const load = refreshDiscordAvatar(source, cacheKey, options).finally(() => {
    pendingLoads.delete(cacheKey);
  });
  pendingLoads.set(cacheKey, load);
  return load;
}
