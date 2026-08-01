import { compendiumHeroImageSource } from "@/app/compendium/model/heroes";

const oneYearInSeconds = 31_536_000;

export const revalidate = 31_536_000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const imageSource = compendiumHeroImageSource(key);
  if (!imageSource) return new Response("Not found", { status: 404 });

  const image = await fetch(imageSource, {
    cache: "force-cache",
    next: { revalidate: oneYearInSeconds },
  });
  if (!image.ok || !image.body) {
    return new Response("Hero image is temporarily unavailable", {
      status: 502,
    });
  }

  return new Response(image.body, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": image.headers.get("content-type") ?? "image/png",
      "x-content-type-options": "nosniff",
    },
  });
}
