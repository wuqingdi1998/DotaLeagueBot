import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CurrentQuestCards } from "./CurrentQuestCards";
import { ManualChallengeForm } from "./ManualChallengeForm";
import { compendiumHeroById } from "../model/heroes";
import type { HistoricalChallenges } from "./challenge-history-types";

it("renders the date selector, all five tasks and their real manual forms", () => {
  const day: HistoricalChallenges = { dateKey: "2026-10-10", dates: [
    { dateKey: "2026-10-10", label: "10 октября 2026 г." }, { dateKey: "2026-10-09", label: "9 октября 2026 г." },
  ], clanMates: [{ playerId: "200", playerName: "Участник клана" }], challenges: [
    { kind: "daily", id: "10", title: "Испытание 1", heroes: [1, 2, 3, 4, 5, 6].map(compendiumHeroById) },
    { kind: "daily", id: "11", title: "Испытание 2", heroes: [7, 8, 9, 10, 11, 12].map(compendiumHeroById) },
    { kind: "clan_outing", id: "clan_outing", title: "Испытание 3 · Клановая вылазка", heroes: [] },
    { kind: "rune", id: "rune", title: "Испытание Рун", heroes: [compendiumHeroById(55)] },
    { kind: "star_race", id: "2026-10-10", title: "Испытание гонки · Быстрый выходной", heroes: [] },
  ].map((card) => ({ ...card, kind: card.kind as HistoricalChallenges["challenges"][number]["kind"],
    description: "Победите в матче, выполняя условия задания за выбранный день.",
    rewardStars: 2, isCompleted: false, isManual: false, unavailableReason: null })) };
  const markup = renderToStaticMarkup(<>
    <CurrentQuestCards participant={{ discordId: "100", dotaId: "100", playerName: "Участник", avatarUrl: null,
      totalStars: 17, rewardCount: 9, currentQuests: [], currentStarRaceQuests: [] }}
      initialDay={day} onReward={() => {}} />
    <section className="compendium-base-current-quests"><strong>Формы ручного зачёта</strong>
      <div className="compendium-base-current-grid">{day.challenges.map((card) => <article key={card.id} className="compendium-base-current-card">
        <strong>{card.title}</strong><ManualChallengeForm card={card} clanMates={day.clanMates}
          isPending={false} onSave={() => {}} onCancel={() => {}} />
      </article>)}</div>
    </section>
  </>);
  expect(markup).toContain("Дата испытаний (МСК)");
  expect(markup).toContain("9 октября 2026");
  expect(markup.match(/Засчитать вручную/g)).toHaveLength(5);
  expect(markup).toContain("Все учтённые матчи через запятую");
  const styles = readFileSync(resolve("app/styles/43-compendium-base-current-quests.css"), "utf8");
  const dir = resolve(".data/challenge-history-layout");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "index.html"), `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    :root{--surface:#0d2432;--line:#284959;--quiet:#8da9b8;--muted:#bdd0db;--text:#ecf5fa;--blue-strong:#55d8ff}
    *{box-sizing:border-box}body{margin:0;padding:20px;background:#071a27;color:var(--text);font-family:Arial,sans-serif}
    main{max-width:1200px;margin:auto}strong{overflow-wrap:anywhere} ${styles}
    </style><main>${markup}</main></html>`);
});
