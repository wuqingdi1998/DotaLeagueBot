export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { revision: process.env.SITE_RELEASE_SHA ?? "unknown" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
