import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { cupTournament } from "@/tests/cup-schedule-context";
import { TournamentDetailsEditor } from "../admin/TournamentDetailsEditor";
import { OverviewPanel } from "./OverviewPanel";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("../hooks/TournamentContext", async () => import("@/tests/cup-schedule-context"));

describe("cup overview and settings", () => {
  it("renders just group and playoff periods without registration or check-in", () => {
    const html = renderToStaticMarkup(<OverviewPanel />);
    expect(html).toContain("02.11 – 29.11");
    expect(html).toContain("30.11 – 13.12");
    expect(html).not.toMatch(/Регистрация|Чек-ин|Старт турнира/);
  });

  it.each(["seasonal_cup", "ordinary"] as const)("keeps the appropriate settings for %s", (type) => {
    const html = renderToStaticMarkup(<TournamentDetailsEditor
      tournament={{ ...cupTournament, tournament_type: type }} onSaved={async () => {}} onMessage={() => {}} />);
    for (const label of ["Старт регистрации", "Дедлайн регистрации", "Check-in, минут", "Регистрация открыта"]) {
      expect(html.includes(label), label).toBe(type === "ordinary");
    }
    expect(html.includes("Начало плей-офф")).toBe(type === "seasonal_cup");
  });
});
