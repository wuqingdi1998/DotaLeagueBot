"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { FiInfo } from "react-icons/fi";

export function SeasonStandingsInfo({ hasActivityPoints, activityPointsNote }: {
  hasActivityPoints: boolean;
  activityPointsNote: string | null | undefined;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const legendId = useId();
  const isOpen = isHovered || isPinned || isKeyboardFocused;

  useLayoutEffect(() => {
    if (!isOpen) return;
    const positionLegend = () => {
      const anchor = container.current;
      const legend = anchor?.querySelector<HTMLElement>(".season-standings-legend");
      if (!anchor || !legend) return;
      const bounds = anchor.getBoundingClientRect();
      const viewportGap = 16;
      const header = document.querySelector(".site-header")?.getBoundingClientRect();
      const viewportTop = Math.max(viewportGap, header && header.top <= 0 ? header.bottom + viewportGap / 2 : 0);
      const availableBelow = window.innerHeight - bounds.bottom - viewportGap;
      const availableAbove = bounds.top - viewportTop;
      const shouldOpenAbove = legend.scrollHeight + 2 > availableBelow && availableAbove > availableBelow;
      anchor.dataset.side = shouldOpenAbove ? "above" : "below";
      anchor.style.setProperty("--season-info-max-height", `${Math.max(0, shouldOpenAbove ? availableAbove : availableBelow)}px`);
    };
    const close = () => { setIsHovered(false); setIsPinned(false); setIsKeyboardFocused(false); };
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) close();
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", positionLegend);
    window.addEventListener("scroll", positionLegend, true);
    positionLegend();
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", positionLegend);
      window.removeEventListener("scroll", positionLegend, true);
    };
  }, [isOpen]);

  return (
    <div className="season-standings-info" ref={container}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setIsHovered(true); }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") setIsHovered(false); }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setIsHovered(false); setIsPinned(false); setIsKeyboardFocused(false);
      }}>
      <button type="button" className="secondary-button season-standings-info-button"
        aria-expanded={isOpen} aria-controls={legendId} aria-describedby={isOpen ? legendId : undefined}
        onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setIsKeyboardFocused(true); }}
        onClick={() => { setIsPinned((current) => !current); setIsHovered(false); setIsKeyboardFocused(false); }}>
        <FiInfo aria-hidden="true" /> Как начисляются очки
      </button>
      {isOpen && <aside id={legendId} className="season-standings-legend" role="tooltip" aria-label="Легенда таблицы">
        <h4>Как начисляются очки</h4>
        <p><i className="win" /> Победа <strong>+2</strong></p>
        <p><i className="draw" /> Ничья <strong>+1</strong></p>
        <p><i className="loss" /> Поражение <strong>0</strong></p>
        <p><i className="substitute" /> Игрок замены</p>
        <p><i className="suspended" /> Пропуск из-за штрафа</p>
        <hr />
        <p className="season-legend-explanation"><b>p</b> — ручные поправки, бонусы за замену и снятия за штрафные огоньки.</p>
        {hasActivityPoints && <p className="season-legend-explanation"><b>+ap</b> —{" "}
          {activityPointsNote ?? "отдельные базовые очки за активность по правилам этого сезона."}
        </p>}
        <p className="season-legend-explanation"><b>%WR</b> — процент выигранных карт. При равенстве очков выше
          ставится игрок с большим %WR, затем с большим числом сыгранных туров.</p>
      </aside>}
    </div>
  );
}
