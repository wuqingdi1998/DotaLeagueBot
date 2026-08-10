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
const playerSearchRoute = readFileSync(
  new URL("../app/api/players/route.ts", import.meta.url),
  "utf8",
);

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
    expect(tournamentSource).toContain(
      "shouldShowMatchReadiness(match, isPast)",
    );
    expect(tournamentSource).toContain('match.status === "scheduled"');
    expect(tournamentSource).toContain("captainApplicationIds.has");
    expect(tournamentSource).toContain("Вы приняли приглашение в команду");
    expect(tournamentSource).toContain("Зарегистрировать команду");
  });

  it("keeps organizer controls for groups, matches and results", () => {
    expect(tournamentSource).toContain("/api/admin/groups");
    expect(tournamentSource).toContain("/api/admin/matches");
    expect(tournamentSource).toContain("/api/admin/tournament-results");
    expect(tournamentSource).toContain("Сформировать группы");
    expect(tournamentSource).toContain("Шаффл");
    expect(tournamentSource).toContain("Матчи и результаты");
  });

  it("searches the full player list after two nickname characters", () => {
    expect(tournamentSource).toContain("minimumPlayerSearchLength = 2");
    expect(tournamentSource).toContain("PlayerAutocomplete");
    expect(tournamentSource).toContain("encodeURIComponent(search)");
    expect(playerSearchRoute).toContain("search.length < 2");
    expect(playerSearchRoute).toContain("ingame_name ILIKE");
    expect(playerSearchRoute).toContain("LIMIT 100");
  });

  it("gives every tournament settings field an opaque background", () => {
    expect(stylesSource).toMatch(
      /\.admin-panel input:not\(\[type="checkbox"\]\)[^}]+background-color:\s*var\(--surface\)/,
    );
    expect(stylesSource).toMatch(
      /\.admin-panel textarea,[\s\S]*?\.admin-panel select\s*\{[^}]*background-color:\s*var\(--surface\)/,
    );
  });

  it("keeps additional-rule numbers readable in the light theme", () => {
    expect(stylesSource).toMatch(
      /\.site-shell\[data-theme="light"\] \.tournament-rules-list li::before\s*\{[^}]*color:\s*#fff;/,
    );
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
