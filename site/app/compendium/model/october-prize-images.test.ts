import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { OCTOBER_CLAN_PRIZES } from "../../organizer/compendium-october/model/clan-prizes";
import { OCTOBER_COMPENDIUM_WEEKS } from "./october-star-race";
import generatedImages from "./october-prize-images.generated.json";
import { octoberPrizeImagePath } from "./october-prize-images";

const publicRoot = new URL("../../../public/", import.meta.url);

describe("optimized October prize images", () => {
  it("covers every current prize and preserves the dedicated thumbnail framing", () => {
    for (const prize of OCTOBER_CLAN_PRIZES) {
      for (const source of [prize.imagePath, prize.thumbnailImagePath]) {
        if (!source) continue;
        expect(octoberPrizeImagePath(source, "thumbnail")).toMatch(/\/prizes\/.*-thumbnail-[a-f0-9]{12}\.webp$/);
        expect(octoberPrizeImagePath(source, "preview")).toMatch(/\/prizes\/.*-preview-[a-f0-9]{12}\.webp$/);
      }
    }
    for (const week of OCTOBER_COMPENDIUM_WEEKS) {
      for (const prize of week.prizes) {
        if (prize.imageUrl) expect(octoberPrizeImagePath(prize.imageUrl, "preview")).not.toBe(prize.imageUrl);
      }
    }
  });

  it("ships small retina-ready images with transparency and content-based cache versions", async () => {
    for (const [source, variants] of Object.entries(generatedImages)) {
      const original = await sharp(readFileSync(new URL(source.slice(1), publicRoot))).metadata();
      for (const [variant, path] of Object.entries(variants)) {
        const content = readFileSync(new URL(path.slice(1), publicRoot));
        const metadata = await sharp(content).metadata();
        const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
        expect(path).toContain(`-${hash}.webp`);
        expect(metadata.format).toBe("webp");
        expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBeLessThanOrEqual(variant === "thumbnail" ? 224 : 640);
        expect(content.length).toBeLessThan(variant === "thumbnail" ? 80_000 : 240_000);
        if (original.hasAlpha) expect(metadata.hasAlpha).toBe(true);
      }
    }
  });

  it("caches versioned prize files for a year without changing other image URLs", async () => {
    const headers = await nextConfig.headers?.();
    expect(headers?.find((entry) => entry.source === "/compendium/october/prizes/:path*")?.headers)
      .toContainEqual({ key: "Cache-Control", value: "public, max-age=31536000, immutable" });
    expect(octoberPrizeImagePath("/compendium/star-race/archived.gif", "preview"))
      .toBe("/compendium/star-race/archived.gif");
  });
});
