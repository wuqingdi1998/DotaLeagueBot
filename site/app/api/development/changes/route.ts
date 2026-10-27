import manifest from "@/lib/development/release-manifest.json";
import { isDevelopmentSite } from "@/lib/development/environment";
import { compareReleases } from "@/lib/development/releases";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDevelopmentSite()) return new Response(null, { status: 404 });
  let productionRevision: string | null = null;
  try {
    const baseUrl = process.env.PRODUCTION_BASE_URL;
    if (!baseUrl) throw new Error("Production address is not configured");
    const response = await fetch(new URL("/api/version", baseUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
      redirect: "error",
    });
    if (response.ok) {
      const body = await response.json() as { revision?: unknown };
      if (typeof body.revision === "string" && /^[a-f0-9]{40}$/.test(body.revision)) {
        productionRevision = body.revision;
      }
    }
  } catch {
    // A failed comparison must not claim that a release is safe or already live.
  }
  return Response.json(compareReleases(manifest, productionRevision), {
    headers: { "Cache-Control": "no-store" },
  });
}
