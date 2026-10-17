import { createElement, type ImgHTMLAttributes } from "react";

type TestImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string; fill?: boolean; priority?: boolean; unoptimized?: boolean;
};
export function testImageSource(source: string): string {
  const hero = source.match(/^\/api\/compendium\/heroes\/([a-z0-9_]+)(?:\?|$)/);
  if (hero) return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${hero[1]}.png`;
  return source.startsWith("/compendium/") && !source.includes("..") ? source : "";
}
export default function TestImage({ src, fill, priority, unoptimized, style, alt, ...props }: TestImageProps) {
  void priority; void unoptimized;
  // The sandbox only permits static artwork; live image/account endpoints are not used.
  return createElement("img", { ...props, alt: alt ?? "", src: testImageSource(src), style: fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style } : style });
}
