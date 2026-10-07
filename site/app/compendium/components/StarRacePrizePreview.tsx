"use client";

import Image from "next/image";
import { FiImage } from "react-icons/fi";
import { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StarRacePrize } from "../model/star-race";
import { octoberPrizeImagePath } from "../model/october-prize-images";

type PrizePreviewPosition = {
  top: number;
  left: number;
  placement: "above" | "below";
};

export function StarRacePrizePreview({
  prize,
  variant = "name",
}: {
  prize: StarRacePrize;
  variant?: "name" | "thumbnail";
}) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [position, setPosition] = useState<PrizePreviewPosition | null>(null);
  const tooltipId = useId();

  const showPreview = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const bounds = anchor.getBoundingClientRect();
    const viewportPadding = 12;
    const previewWidth = Math.min(220, window.innerWidth - viewportPadding * 2);
    const previewHeight = Math.min(240, window.innerHeight - viewportPadding * 2);
    const placement = bounds.top >= previewHeight + viewportPadding
      ? "above"
      : "below";
    setPosition({
      top: placement === "above" ? bounds.top - 9 : bounds.bottom + 9,
      left: Math.min(
        window.innerWidth - previewWidth / 2 - viewportPadding,
        Math.max(previewWidth / 2 + viewportPadding, bounds.left + bounds.width / 2),
      ),
      placement,
    });
  }, []);

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
      ref={anchorRef}
      aria-describedby={position ? tooltipId : undefined}
      aria-label={`${
        isThumbnail ? `Приз за место ${prize.place}: ` : ""
      }${prize.title}. Изображение появится при наведении или фокусе.`}
      onMouseEnter={showPreview}
      onMouseLeave={() => setPosition(null)}
      onFocus={showPreview}
      onBlur={() => setPosition(null)}
    >
      {isThumbnail ? (
        <Image
          src={octoberPrizeImagePath(prize.imageUrl, "thumbnail")}
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
      {position && typeof document !== "undefined" && createPortal(
        <span
          className={`compendium-star-race-prize-preview compendium-star-race-prize-preview--${position.placement}`}
          id={tooltipId}
          role="tooltip"
          style={{ top: position.top, left: position.left }}
        >
          <span className="compendium-star-race-prize-image">
            <Image
              src={octoberPrizeImagePath(prize.imageUrl, "preview")}
              alt={prize.title}
              fill
              sizes="200px"
              loading="eager"
              unoptimized
            />
          </span>
          <strong>{prize.title}</strong>
        </span>,
        document.body,
      )}
    </span>
  );
}
