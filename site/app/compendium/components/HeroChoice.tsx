import Image from "next/image";
import type { CompendiumHero } from "../model/types";

export function HeroChoice({
  hero,
  isMatched,
  isDimmed = false,
}: {
  hero: CompendiumHero;
  isMatched: boolean;
  isDimmed?: boolean;
}) {
  return (
    <div
      className={`compendium-hero${isMatched ? " matched" : ""}${
        isDimmed ? " dimmed" : ""
      }`}
    >
      <div className="compendium-hero-portrait">
        <Image
          src={hero.imageUrl}
          alt={`Герой ${hero.name}`}
          width={160}
          height={90}
          loading="eager"
          unoptimized
        />
      </div>
      <strong>{hero.name}</strong>
    </div>
  );
}
