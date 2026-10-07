import generatedImages from "./october-prize-images.generated.json";

type PrizeImageVariant = "thumbnail" | "preview";
const optimizedImages: Readonly<Record<string, Record<PrizeImageVariant, string>>> = generatedImages;

export function octoberPrizeImagePath(sourcePath: string, variant: PrizeImageVariant): string {
  return optimizedImages[sourcePath]?.[variant] ?? sourcePath;
}
