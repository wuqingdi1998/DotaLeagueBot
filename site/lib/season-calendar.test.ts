import { describe, expect, it } from "vitest";
import {
  buildCalendarPeriodSegments,
  buildSeasonCalendarMonths,
  parseSeasonCalendarEventInput,
  SeasonCalendarValidationError,
} from "./season-calendar";

describe("season calendar", () => {
  it("removes weeks that are completely empty", () => {
    const months = buildSeasonCalendarMonths([]);
    expect(months.map((month) => month.name)).toEqual([
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ]);
    expect(months.map((month) => month.days.length)).toEqual([35, 35, 42, 35]);
    expect(months[0].days.find((day) => day.dayNumber === 1)?.date).toBe(
      "2026-09-01",
    );
  });

  it("places every saved event on its calendar date", () => {
    const event = {
      id: 7,
      date: "2026-10-18",
      title: "Финал кубка",
      color: "#7C5CFC",
    };
    const october = buildSeasonCalendarMonths([event])[1];
    expect(october.days.find((day) => day.date === event.date)?.events).toEqual([
      event,
    ]);
  });

  it("outlines the league cup across its November and December calendar rows", () => {
    const months = buildSeasonCalendarMonths([]);
    const septemberSegments = buildCalendarPeriodSegments(months[0]);
    const octoberSegments = buildCalendarPeriodSegments(months[1]);
    const novemberSegment = buildCalendarPeriodSegments(months[2])[0];
    const decemberSegment = buildCalendarPeriodSegments(months[3])[0];

    expect(septemberSegments).toEqual([]);
    expect(octoberSegments).toEqual([]);
    expect(novemberSegment).toMatchObject({
      title: "Linken's Sphere Esports League Cup Season 9",
      startDate: "2026-11-02",
      endDate: "2026-12-13",
      color: "#D4A05B",
      accentColor: "#72977A",
      hasTopEdge: true,
      hasBottomEdge: false,
      startRow: 1,
      rowSpan: 5,
      rowCount: 6,
    });
    expect(decemberSegment).toMatchObject({
      hasTopEdge: false,
      hasBottomEdge: true,
      startRow: 0,
      rowSpan: 2,
      rowCount: 5,
    });
  });

  it("normalizes valid editor input and rejects dates outside season nine", () => {
    expect(
      parseSeasonCalendarEventInput({
        date: "2026-12-31",
        title: "  Гранд-финал  ",
        color: "#00c3ff",
      }),
    ).toEqual({ date: "2026-12-31", title: "Гранд-финал", color: "#00C3FF" });
    expect(() =>
      parseSeasonCalendarEventInput({
        date: "2027-01-01",
        title: "Позднее событие",
        color: "#00C3FF",
      }),
    ).toThrow(SeasonCalendarValidationError);
    expect(() =>
      parseSeasonCalendarEventInput({
        date: "2026-10-99",
        title: "Неверная дата",
        color: "#00C3FF",
      }),
    ).toThrow(SeasonCalendarValidationError);
  });
});
