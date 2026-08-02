import { compendiumTeamByKey } from "@/app/compendium/model/teams";

const cacheSeconds = 86_400;

export const revalidate = 86_400;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const team = compendiumTeamByKey((await params).key);
  if (!team?.liquipediaLogoPath) return new Response("Not found", { status: 404 });

  const upstream = await fetch(`https://liquipedia.net${team.liquipediaLogoPath}`, {
    cache: "force-cache",
    headers: {
      "user-agent": "LinkensSphereEsports/1.0 (https://lsesports.ru)",
    },
    next: { revalidate: cacheSeconds },
  });
  if (!upstream.ok || !upstream.body) {
    return new Response("Team logo is temporarily unavailable", { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "cache-control": `public, max-age=${cacheSeconds}, stale-while-revalidate=604800`,
      "content-type": upstream.headers.get("content-type") ?? "image/png",
      "x-content-type-options": "nosniff",
    },
  });
}
