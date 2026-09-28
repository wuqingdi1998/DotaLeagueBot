"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { FiGift } from "react-icons/fi";
import {
  OCTOBER_CLAN_PRIZES,
  type OctoberClanPrize,
  type OctoberClanPrizePool,
} from "../model/clan-prizes";

const prizePoolLabels: Record<OctoberClanPrizePool, string> = {
  winners: "Победители",
  "runners-up": "Проигравшие",
};

type PrizePopoverPosition = {
  top: number;
  left: number;
};

function PrizeSlot({ prize }: { prize: OctoberClanPrize }) {
  const poolLabel = prizePoolLabels[prize.pool];
  const prizeName = prize.name ?? "Приз пока не выбран";
  const [popoverPosition, setPopoverPosition] = useState<PrizePopoverPosition | null>(null);
  const tooltipId = `october-clan-prize-${prize.id}`;

  function showPopover(target: HTMLElement) {
    const bounds = target.getBoundingClientRect();
    const halfPopoverWidth = 95;
    const viewportPadding = 12;
    setPopoverPosition({
      top: bounds.top - 9,
      left: Math.min(
        window.innerWidth - halfPopoverWidth - viewportPadding,
        Math.max(halfPopoverWidth + viewportPadding, bounds.left + bounds.width / 2),
      ),
    });
  }

  return (
    <>
      <li
        className={`october-clan-prize-slot october-clan-prize-slot--${prize.pool}`}
        tabIndex={0}
        data-prize-pool={prize.pool}
        aria-label={`${poolLabel}, слот ${prize.poolPosition}: ${prizeName}`}
        aria-describedby={popoverPosition ? tooltipId : undefined}
        onMouseEnter={(event) => showPopover(event.currentTarget)}
        onMouseLeave={() => setPopoverPosition(null)}
        onFocus={(event) => showPopover(event.currentTarget)}
        onBlur={() => setPopoverPosition(null)}
      >
        <span>{prize.poolPosition}</span>
        <FiGift aria-hidden="true" />
      </li>
      {popoverPosition && typeof document !== "undefined" && createPortal(
        <div
          className="october-clan-prize-popover"
          id={tooltipId}
          role="tooltip"
          style={popoverPosition as CSSProperties}
        >
        <div className="october-clan-prize-image">
          {prize.imagePath ? (
            <Image src={prize.imagePath} alt="" fill sizes="180px" />
          ) : (
            <FiGift aria-hidden="true" />
          )}
        </div>
        <strong>{prizeName}</strong>
        <span>{prize.approximateValue ?? "Примерная ценность будет указана позже"}</span>
        </div>,
        document.body,
      )}
    </>
  );
}

export function OctoberClanPrizeBoard() {
  return (
    <section className="october-clan-prize-board" aria-labelledby="october-clan-prizes-title">
      <div className="october-clan-prize-copy">
        <p id="october-clan-prizes-title">
          10 предметов в финальном розыгрыше, каждая звезда – дополнительный шанс на выигрыш
        </p>
        <p>
          Победители разыграют 7 предметов, проигравшие – 3
        </p>
      </div>
      <ul aria-label="Призовые слоты кланового зачёта">
        {OCTOBER_CLAN_PRIZES.map((prize) => <PrizeSlot key={prize.id} prize={prize} />)}
      </ul>
    </section>
  );
}
