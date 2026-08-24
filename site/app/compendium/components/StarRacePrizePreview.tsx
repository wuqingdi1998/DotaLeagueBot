import Image from "next/image";
import { FiImage } from "react-icons/fi";
import type { StarRacePrize } from "../model/star-race";

export function StarRacePrizePreview({
  prize,
  variant = "name",
}: {
  prize: StarRacePrize;
  variant?: "name" | "thumbnail";
}) {
  if (!prize.imageUrl) {
    return variant === "name" ? (
      <strong className="compendium-star-race-prize-static">
        {prize.title}
      </strong>
    ) : null;
  }

  const isThumbnail = variant === "thumbnail";
  return (
    <span
      className={`compendium-star-race-prize-name${
        isThumbnail ? " compendium-results-prize-image" : ""
      }`}
      tabIndex={0}
      aria-label={`${
        isThumbnail ? `Приз за место ${prize.place}: ` : ""
      }${prize.title}. Изображение появится при наведении или фокусе.`}
    >
      {isThumbnail ? (
        <Image
          src={prize.imageUrl}
          alt=""
          width={36}
          height={36}
          unoptimized
        />
      ) : (
        <>
          <strong>{prize.title}</strong>
          <FiImage aria-hidden="true" />
        </>
      )}
      <span className="compendium-star-race-prize-preview" role="tooltip">
        <Image
          src={prize.imageUrl}
          alt={prize.title}
          width={480}
          height={436}
          unoptimized
        />
      </span>
    </span>
  );
}
