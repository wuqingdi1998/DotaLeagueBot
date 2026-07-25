import { readFile } from "node:fs/promises";
import path from "node:path";
import { isSafeUploadKey } from "@/lib/validation";

export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!isSafeUploadKey(key)) {
    return new Response("Not found", { status: 404 });
  }
  const directory = path.resolve(
    process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads"),
    "team-emblems",
  );
  try {
    const file = await readFile(path.join(directory, key));
    const extension = key.split(".").pop() ?? "";
    return new Response(file, {
      headers: {
        "content-type": contentTypes[extension] ?? "application/octet-stream",
        "cache-control": "public, max-age=86400, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
