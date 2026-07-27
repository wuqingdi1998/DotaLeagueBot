import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadSiteStyles } from "./test-utils/load-styles";

const tournamentPageDirectory = new URL(
  "../app/tournaments/[slug]",
  import.meta.url,
);

function sourceFiles(directory: URL): string[] {
  return readdirSync(directory, { encoding: "utf8" }).flatMap((entry) => {
    const path = new URL(`${entry}`, directory.href.endsWith("/") ? directory : new URL(`${directory.href}/`));
    const filePath = fileURLToPath(path);

    if (statSync(filePath).isDirectory()) {
      return sourceFiles(new URL(`${path.href}/`));
    }

    return /\.(ts|tsx)$/.test(entry) ? [readFileSync(filePath, "utf8")] : [];
  });
}

const tournamentSource = sourceFiles(tournamentPageDirectory).join("\n");
const stylesSource = loadSiteStyles();

describe("tournament page public behavior", () => {
  it("keeps the main tournament navigation", () => {
    for (const label of [
      "Обзор",
      "Команды",
      "Матчи",
      "Групповой этап",
      "Плей-офф",
      "Дополнительные правила",
    ]) {
      expect(tournamentSource).toContain(label);
    }
  });

  it("keeps registration, invitations and check-in actions", () => {
    expect(tournamentSource).toContain("/api/applications");
    expect(tournamentSource).toContain("/api/check-in");
    expect(tournamentSource).toContain("Вы приняли приглашение в команду");
    expect(tournamentSource).toContain("Зарегистрировать команду");
  });

  it("keeps organizer controls for groups, matches and results", () => {
    expect(tournamentSource).toContain("/api/admin/groups");
    expect(tournamentSource).toContain("/api/admin/matches");
    expect(tournamentSource).toContain("/api/admin/tournament-results");
    expect(tournamentSource).toContain("Сформировать группы");
    expect(tournamentSource).toContain("Матчи и результаты");
  });

  it("keeps tournament navigation usable on narrow screens", () => {
    expect(stylesSource).toMatch(
      /\.tabs\s*\{[^}]*overflow-x:\s*auto;[^}]*overflow-y:\s*hidden;/,
    );
    expect(stylesSource).toMatch(
      /\.tournament-tabs-main,\s*\.tournament-tabs-stages\s*\{[^}]*overflow-x:\s*auto;[^}]*overflow-y:\s*hidden;/,
    );
  });
});
