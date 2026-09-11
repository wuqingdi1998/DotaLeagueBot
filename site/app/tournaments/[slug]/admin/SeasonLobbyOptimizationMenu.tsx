"use client";

import { useState } from "react";
import { FiChevronDown, FiZap } from "react-icons/fi";
import type { SeasonLobbyOptimizationVariant } from
  "@/lib/season-lobby-optimization";

const optimizationOptions: Array<{
  description: string;
  label: string;
  variant: SeasonLobbyOptimizationVariant;
}> = [
  {
    description: "Текущий лучший баланс тиров и ролей",
    label: "Оптимальный состав",
    variant: "optimal",
  },
  {
    description: "Следующий вариант с теми же правилами",
    label: "Оптимальный состав 2",
    variant: "optimal2",
  },
  {
    description: "Третий вариант с теми же правилами",
    label: "Оптимальный состав 3",
    variant: "optimal3",
  },
  {
    description: "Снижает повторы команд из прошлого тура",
    label: "Играли вместе",
    variant: "together",
  },
  {
    description: "Смешивает тиры при строгом балансе команд",
    label: "Челлендж",
    variant: "challenge",
  },
];

export function seasonLobbyOptimizationLabel(
  variant: SeasonLobbyOptimizationVariant,
) {
  return optimizationOptions.find((option) => option.variant === variant)
    ?.label ?? "Оптимальный состав";
}

export function SeasonLobbyOptimizationMenu({
  busy,
  disabled,
  onOptimize,
}: {
  busy: boolean;
  disabled: boolean;
  onOptimize: (variant: SeasonLobbyOptimizationVariant) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isDisabled = disabled || busy;

  function selectVariant(variant: SeasonLobbyOptimizationVariant) {
    setIsOpen(false);
    onOptimize(variant);
  }

  return (
    <div
      className={`season-builder-optimization-menu${isOpen ? " open" : ""}`}
    >
      <button
        className="secondary-button compact season-builder-optimization-trigger"
        type="button"
        disabled={isDisabled}
        onClick={() => selectVariant("optimal")}
      >
        <FiZap aria-hidden="true" /> Оптимальный состав
      </button>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Показать варианты состава"
        className="secondary-button compact season-builder-optimization-toggle"
        type="button"
        disabled={isDisabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        <FiChevronDown aria-hidden="true" />
      </button>
      <div
        aria-label="Варианты состава"
        className="season-builder-optimization-options"
        role="menu"
      >
        {optimizationOptions.map((option) => (
          <button
            className="season-builder-optimization-option"
            disabled={isDisabled}
            key={option.variant}
            role="menuitem"
            title={option.description}
            type="button"
            onClick={() => selectVariant(option.variant)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
