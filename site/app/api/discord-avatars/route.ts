import path from "node:path";
import { loadDiscordAvatar } from "@/lib/discord-avatar-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function avatarCacheDirectory() {
  return path.resolve(
    process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads"),
    "discord-avatars",
  );
}

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("source");
  if (!source || source.length > 1_024) {
    return new Response("Not found", { status: 404 });
  }

  const avatar = await loadDiscordAvatar(source, {
    cacheDirectory: avatarCacheDirectory(),
  });
  if (!avatar) {
    return new Response("Avatar is temporarily unavailable", { status: 502 });
  }

  return new Response(new Uint8Array(avatar.body).buffer, {
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=86400",
      "content-type": avatar.contentType,
      "x-avatar-cache": avatar.state,
      "x-content-type-options": "nosniff",
    },
  });
}
