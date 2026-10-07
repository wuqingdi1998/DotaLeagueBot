"use client";

import Image from "next/image";
import { useState } from "react";
import { createPortal } from "react-dom";
import { FiGift } from "react-icons/fi";
import {
  OCTOBER_CLAN_ADDITIONAL_PRIZES,
  OCTOBER_CLAN_PRIZES,
  OCTOBER_CLAN_PRIMARY_PRIZES,
  OCTOBER_CLAN_SMALL_PRIZES,
  type OctoberClanPrize,
  type OctoberClanPrizePool,
} from "../model/clan-prizes";
import { OctoberStarEarningGuide } from "./OctoberStarEarningGuide";
import type { SeasonTournamentLinks } from "@/app/season/model/season-overview-model";

const prizePoolLabels: Record<OctoberClanPrizePool, string> = {
  winners: "Победители",
  "runners-up": "Проигравшие",
};

type PrizePopoverPosition = {
  top: number;
  left: number;
  placement: "above" | "below";
};

function PrizeSlot({
  prize,
  row,
}: {
  prize: OctoberClanPrize;
  row: "primary" | "additional" | "small";
}) {
  const poolLabel = prizePoolLabels[prize.pool];
  const prizeName = prize.name ?? "Приз пока не выбран";
  const prizeValueLabel = prize.approximateValue
    ? `Ценность ~ ${prize.approximateValue}`
    : "Ценность пока не указана";
  const slotImagePath = prize.thumbnailImagePath ?? prize.imagePath;
  const isPoolStart = prize.pool === "runners-up"
    && [1, 4, 7].includes(prize.poolPosition);
  const [popoverPosition, setPopoverPosition] = useState<PrizePopoverPosition | null>(null);
  const tooltipId = `october-clan-prize-${prize.id}`;

  function showPopover(target: HTMLElement) {
    const bounds = target.getBoundingClientRect();
    const halfPopoverWidth = prize.hasLargePreview ? 130 : 110;
    const viewportPadding = 12;
    const estimatedPopoverHeight = prize.hasLargePreview ? 290 : 200;
    const placement = bounds.top >= estimatedPopoverHeight + viewportPadding
      ? "above"
      : "below";
    setPopoverPosition({
      top: placement === "above" ? bounds.top - 9 : bounds.bottom + 9,
      left: Math.min(
        window.innerWidth - halfPopoverWidth - viewportPadding,
        Math.max(halfPopoverWidth + viewportPadding, bounds.left + bounds.width / 2),
      ),
      placement,
    });
  }

  return (
    <>
      <li
        className={`october-clan-prize-slot october-clan-prize-slot--${prize.pool}${
          isPoolStart ? " october-clan-prize-slot--pool-start" : ""
        }`}
        style={{ position: "relative" }}
        tabIndex={0}
        data-prize-pool={prize.pool}
        data-prize-row={row}
        aria-label={`${poolLabel}, слот ${prize.poolPosition}: ${prizeName}`}
        aria-describedby={popoverPosition ? tooltipId : undefined}
        onMouseEnter={(event) => showPopover(event.currentTarget)}
        onMouseLeave={() => setPopoverPosition(null)}
        onFocus={(event) => showPopover(event.currentTarget)}
        onBlur={() => setPopoverPosition(null)}
      >
        <span className="october-clan-prize-place">{prize.poolPosition}</span>
        {slotImagePath ? (
          <Image
            className="october-clan-prize-slot-image"
            src={slotImagePath}
            alt=""
            fill
            sizes={row === "primary" ? "56px" : "112px"}
          />
        ) : (
          <FiGift aria-hidden="true" />
        )}
      </li>
      {popoverPosition && typeof document !== "undefined" && createPortal(
        <div
          className={`october-clan-prize-popover october-clan-prize-popover--${popoverPosition.placement}${prize.hasLargePreview ? " october-clan-prize-popover--large" : ""}`}
          id={tooltipId}
          role="tooltip"
          style={{ top: popoverPosition.top, left: popoverPosition.left }}
        >
        <div
          className={`october-clan-prize-image${prize.hasLargePreview ? " october-clan-prize-image--large" : ""}`}
          style={{ position: "relative" }}
        >
          {prize.imagePath ? (
            <Image src={prize.imagePath} alt="" fill sizes="180px" />
          ) : (
            <FiGift aria-hidden="true" />
          )}
        </div>
        <strong>{prizeName}</strong>
        <span>{prizeValueLabel}</span>
        </div>,
        document.body,
      )}
    </>
  );
}

export function OctoberClanPrizeBoard({
  isOrganizer = false,
  tournamentLinks = {},
}: {
  isOrganizer?: boolean;
  tournamentLinks?: SeasonTournamentLinks;
}) {
  const [areAllPrizesVisible, setAreAllPrizesVisible] = useState(false);
  return (
    <section className="october-clan-prize-board" aria-labelledby="october-clan-prizes-title" data-mobile-expanded={areAllPrizesVisible}>
      <div className="october-clan-prize-copy">
        <p id="october-clan-prizes-title">
          30 предметов в финальном розыгрыше
        </p>
        <p>
          Каждая звезда – дополнительный шанс на выигрыш
        </p>
        <p>
          Победители разыграют 21 предмет, проигравшие – 9
        </p>
        <OctoberStarEarningGuide
          isOrganizer={isOrganizer}
          tournamentLinks={tournamentLinks}
        />
      </div>
      <div className="october-clan-prize-lists" id="october-clan-prize-lists">
        <ul
          className="october-clan-prize-row october-clan-prize-row--primary"
          aria-label="Основные призовые слоты кланового зачёта"
        >
          {OCTOBER_CLAN_PRIMARY_PRIZES.map((prize) => (
            <PrizeSlot key={prize.id} prize={prize} row="primary" />
          ))}
        </ul>
        <ul
          className="october-clan-prize-row october-clan-prize-row--additional"
          aria-label="Дополнительные призовые слоты кланового зачёта"
        >
          {OCTOBER_CLAN_ADDITIONAL_PRIZES.map((prize) => (
            <PrizeSlot key={prize.id} prize={prize} row="additional" />
          ))}
        </ul>
        <ul
          className="october-clan-prize-row october-clan-prize-row--small"
          aria-label="Малые призовые слоты кланового зачёта"
        >
          {OCTOBER_CLAN_SMALL_PRIZES.map((prize) => (
            <PrizeSlot key={prize.id} prize={prize} row="small" />
          ))}
        </ul>
      </div>
      <button
        type="button"
        className="october-clan-prize-toggle"
        aria-expanded={areAllPrizesVisible}
        aria-controls="october-clan-prize-lists"
        onClick={() => setAreAllPrizesVisible((current) => !current)}
      >
        {areAllPrizesVisible ? "Свернуть призы" : `Показать все ${OCTOBER_CLAN_PRIZES.length} призов`}
      </button>
    </section>
  );
}
