import { readFile } from "node:fs/promises";
import path from "node:path";
import { isSafeUploadKey } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!isSafeUploadKey(key) || !key.endsWith(".jpg")) {
    return new Response("Not found", { status: 404 });
  }
  const directory = path.resolve(
    process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads"),
    "profile-backgrounds",
  );
  try {
    const file = await readFile(path.join(directory, key));
    return new Response(file, {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=86400, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
