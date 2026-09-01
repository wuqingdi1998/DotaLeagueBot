import type { CSSProperties } from "react";
import type { CalendarPeriodSegment } from "@/lib/season-calendar";

const periodEdges = ["top", "right", "bottom", "left"] as const;

type PeriodOutlineStyle = CSSProperties & {
  "--calendar-period-accent-color": string;
  "--calendar-period-color": string;
  "--calendar-period-row-count": number;
  "--calendar-period-row-span": number;
  "--calendar-period-start-row": number;
};

export function CalendarPeriodOutline({
  period,
}: {
  period: CalendarPeriodSegment;
}) {
  const style: PeriodOutlineStyle = {
    "--calendar-period-accent-color": period.accentColor,
    "--calendar-period-color": period.color,
    "--calendar-period-row-count": period.rowCount,
    "--calendar-period-row-span": period.rowSpan,
    "--calendar-period-start-row": period.startRow,
  };
  const visibleEdges = periodEdges.filter(
    (edge) =>
      (edge !== "top" || period.hasTopEdge) &&
      (edge !== "bottom" || period.hasBottomEdge),
  );

  return (
    <span
      className="calendar-period-outline"
      data-tooltip={period.title}
      style={style}
    >
      {visibleEdges.map((edge, edgeIndex) => (
        <button
          aria-label={period.title}
          className={`calendar-period-edge is-${edge}`}
          key={edge}
          tabIndex={edgeIndex === 0 ? 0 : -1}
          type="button"
        />
      ))}
    </span>
  );
}
