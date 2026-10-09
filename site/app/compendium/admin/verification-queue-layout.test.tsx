import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
import { VerificationQueue } from "./VerificationQueue";
import type { VerificationRequest } from "../model/verification-retries";

it("renders waiting, successful and exhausted requests without confusing recheck with an award", () => {
  const requests: VerificationRequest[] = ["pending", "completed", "exhausted"].map((status, index) => ({
    id: String(index + 1), playerId: "100", playerName: "Участник с длинным именем", status: status as VerificationRequest["status"],
    snapshot: { kind: "daily", dateKey: "2026-10-11", questId: "10", title: "Испытание 1", dotaId: "100", rewardStars: 2,
      startsAt: "2026-10-11T00:00:00+03:00", endsAt: "2026-10-12T00:00:00+03:00", heroIds: [7], clanMates: [], requirement: null },
    startedAt: "2026-10-11T23:30:00+03:00", nextAttemptAt: status === "pending" ? "2026-10-12T00:30:00+03:00" : null,
    attempts: 10, manualAttempts: 1, notifiedAt: null, lastError: status === "completed" ? null : "OpenDota ещё не передал статистику подходящих матчей",
  }));
  const markup = renderToStaticMarkup(<VerificationQueue initialRequests={requests} />);
  expect(markup).toContain("Результат засчитан");
  expect(markup).toContain("Два часа истекли");
  expect(markup.match(/>Проверить вручную</g)).toHaveLength(2);
  expect(markup).toContain("запрашивает результат у OpenDota");
  const styles = ["01-foundation.css", "36-compendium-base.css", "44-compendium-verification-queue.css"]
    .map((name) => readFileSync(resolve("app/styles", name), "utf8")).join("\n");
  const dir = resolve(".data/verification-queue-layout");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "index.html"), `<!doctype html><html lang="ru" data-theme="dark"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style><main>${markup}</main></html>`);
});
