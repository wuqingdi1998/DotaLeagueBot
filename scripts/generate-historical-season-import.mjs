import fs from "node:fs";
import {
  historicalCurrentAliases as currentAliases,
  historicalSeasonMetadata as metadata,
  historicalWithinSeasonAliases as withinSeasonAliases,
} from "./historical-season-import-config.mjs";
import { historicalMatchOutcomeSummary } from "./historical-season-audit.mjs";
import { writeHistoricalSeasonImport } from "./historical-season-import-writer.mjs";
import { parseHistoricalSeasonWorkbooks } from "./historical-season-parser.mjs";
const [sourcePath, sqlPath, reportPath, livePlayersPath] = process.argv.slice(2);
if (!sourcePath || !sqlPath || !reportPath)
  throw new Error("Укажите JSON Excel, SQL миграцию и Markdown-отчёт");
const sourceJson = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");
const workbooks = JSON.parse(sourceJson);
const clean = (value) =>
  String(value ?? "").replace(/[⭐★]/g, "").replace(/\s+/g, " ").trim();
const key = (value) =>
  clean(value).toLocaleLowerCase("ru").replace(/[’`]/g, "'");
const numberOr = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
const levenshtein = (leftValue, rightValue) => {
  const left = key(leftValue);
  const right = key(rightValue);
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        previous +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[right.length];
};
const role = (value) => {
  const text = clean(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${Number(match[3])}/${Number(match[2])}` : text;
};

const canonical = (season, nickname) =>
  withinSeasonAliases[`${season}|${key(nickname)}`] ?? clean(nickname);
const outcome = (symbol) =>
  symbol === "," ? "win" : symbol === "\\" ? "draw" : symbol === "." ? "loss" : null;
const dateForRound = (year, value) => {
  const [day, month] = clean(value).split(".").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const seasons = parseHistoricalSeasonWorkbooks(workbooks, {
  clean, key, numberOr, role, canonical, outcome,
});
const participantSources = [];
const matchSources = [];
const adjustmentSources = [];
const penaltySources = [];
const roundSources = [];
const finalistSources = [];
const discrepancy = [];
const unknownOccurrences = new Map();
const aliasMappings = [];
const aliasCandidates = [];

for (const seasonData of seasons) {
  const season = seasonData.season;
  const meta = metadata[season];
  const tableByName = new Map(
    seasonData.table.participants.map((entry) => [key(entry.canonical), entry]),
  );
  const allMatches = [...seasonData.regularMatches, ...seasonData.finalMatches];
  const extraNames = new Map();
  for (const match of allMatches) {
    for (const player of [...match.teamA, ...match.teamB]) {
      if (!tableByName.has(key(player.canonical))) {
        extraNames.set(key(player.canonical), player.canonical);
      }
    }
  }
  for (const fire of seasonData.table.fires) {
    if (!tableByName.has(key(fire.canonical))) {
      extraNames.set(key(fire.canonical), fire.canonical);
    }
  }
  const rows = [
    ...seasonData.table.participants,
    ...[...extraNames.values()].map((nickname, index) => ({
      nickname,
      canonical: nickname,
      rank: seasonData.table.participants.filter((row) => row.section === "inactive").length + index + 1,
      section: "inactive",
      rating: 0,
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      pointsP: 0,
      activityPoints: 0,
      rounds: Array(14).fill(null),
      winRate: null,
      reason: "Есть в турах, финале или штрафах, но отсутствует в итоговой таблице Excel",
    })),
  ];
  const seenCanonical = new Set();
  for (const [index, row] of rows.entries()) {
    if (seenCanonical.has(key(row.canonical))) continue;
    seenCanonical.add(key(row.canonical));
    const target = currentAliases[key(row.canonical)] ?? row.canonical;
    participantSources.push({
      season,
      nickname: row.canonical,
      section: row.section,
      rank: row.rank ?? index + 1,
      reason: row.reason ?? null,
      snapshot: row.reason
        ? null
        : {
            playedRounds: row.games,
            wins: row.wins,
            draws: row.draws,
            losses: row.losses,
            adjustmentPoints: row.pointsP,
            activityPoints: row.activityPoints,
            points: row.rating,
            winRate: row.winRate,
            supportsActivityPoints: seasonData.table.hasActivityPoints,
          },
      linkedNickname: target,
    });
    if (key(target) !== key(row.canonical)) {
      aliasMappings.push({ season, historical: row.canonical, current: target });
    }
  }
  for (let roundNumber = 1; roundNumber <= 14; roundNumber += 1) {
    const date = dateForRound(meta.year, seasonData.table.roundDates[roundNumber - 1]);
    roundSources.push({
      season,
      roundNumber,
      name: `Тур ${roundNumber}`,
      kind: "regular",
      scheduledAt: `${date}T20:00:00+03:00`,
      status: "completed",
    });
  }
  roundSources.push({
    season,
    roundNumber: 15,
    name: "Финалы",
    kind: "finals",
    scheduledAt: `${meta.finals}T20:00:00+03:00`,
    status: seasonData.finalMatches.every((match) => match.result) ? "completed" : "planned",
  });
  for (const match of allMatches) {
    const date =
      match.roundNumber === 15
        ? meta.finals
        : dateForRound(meta.year, seasonData.table.roundDates[match.roundNumber - 1]);
    matchSources.push({
      season,
      ...match,
      scheduledAt: `${date}T${match.time}:00+03:00`,
      status: match.result ? "completed" : "published",
    });
    for (const difference of match.tierDifferences) {
      discrepancy.push(`Сезон ${season}, тур ${match.roundNumber}: тир ${difference.nickname} в составе ${difference.roster}, в списке тура ${difference.list}.`);
    }
    for (const [side, players, displayedSum] of [
      ["A", match.teamA, match.teamATierSum],
      ["B", match.teamB, match.teamBTierSum],
    ]) {
      const calculatedSum = players.reduce(
        (sum, player) => sum + numberOr(player.tier),
        0,
      );
      if (
        Number.isInteger(displayedSum) &&
        displayedSum !== calculatedSum
      ) {
        discrepancy.push(
          `Сезон ${season}, тур ${match.roundNumber}, ${match.title}: сумма тиров команды ${side} в Excel ${displayedSum}, по пяти игрокам получается ${calculatedSum}.`,
        );
      }
    }
  }
  for (let roundNumber = 1; roundNumber <= 14; roundNumber += 1) {
    const roundMatches = seasonData.regularMatches.filter(
      (match) => match.roundNumber === roundNumber,
    );
    const rosterOccurrences = new Map();
    for (const match of roundMatches) {
      for (const [side, players] of [
        ["team_a", match.teamA],
        ["team_b", match.teamB],
      ]) {
        const expectedOutcome =
          match.result === "draw"
            ? "draw"
            : match.result === side
              ? "win"
              : "loss";
        for (const player of players) {
          const playerKey = key(player.canonical);
          const previous = rosterOccurrences.get(playerKey) ?? [];
          previous.push(match.title);
          rosterOccurrences.set(playerKey, previous);
          const tableRow = tableByName.get(playerKey);
          if (!tableRow) continue;
          const tableOutcome = outcome(tableRow.rounds[roundNumber - 1]);
          if (tableOutcome && tableOutcome !== expectedOutcome) {
            discrepancy.push(
              `Сезон ${season}, тур ${roundNumber}: у ${player.nickname} в таблице стоит «${tableOutcome}», но результат состава в ${match.title} даёт «${expectedOutcome}».`,
            );
          }
        }
      }
    }
    for (const [playerKey, matches] of rosterOccurrences) {
      if (matches.length > 1) {
        discrepancy.push(
          `Сезон ${season}, тур ${roundNumber}: ${playerKey} указан в составах ${matches.length} раз (${matches.join(", ")}).`,
        );
      }
      if (!tableByName.has(playerKey)) {
        discrepancy.push(
          `Сезон ${season}, тур ${roundNumber}: ${playerKey} есть в составе, но отсутствует в итоговой таблице Excel.`,
        );
      }
    }
    for (const tableRow of seasonData.table.participants) {
      const hasTableOutcome = Boolean(
        outcome(tableRow.rounds[roundNumber - 1]),
      );
      const hasRoster = rosterOccurrences.has(key(tableRow.canonical));
      if (hasTableOutcome && !hasRoster) {
        discrepancy.push(
          `Сезон ${season}, тур ${roundNumber}: у ${tableRow.nickname} есть результат в итоговой таблице, но игрок не найден в составах тура.`,
        );
      }
      if (!hasTableOutcome && hasRoster) {
        discrepancy.push(
          `Сезон ${season}, тур ${roundNumber}: ${tableRow.nickname} есть в составе, но результат в итоговой таблице пуст.`,
        );
      }
    }
  }
  const rosterOnlyPlayers = new Map();
  const rosterNamesByRound = new Map();
  for (const match of seasonData.regularMatches) {
    const names = rosterNamesByRound.get(match.roundNumber) ?? new Set();
    for (const [side, players] of [
      ["team_a", match.teamA],
      ["team_b", match.teamB],
    ]) {
      const expectedOutcome =
        match.result === "draw"
          ? "draw"
          : match.result === side
            ? "win"
            : "loss";
      for (const player of players) {
        const playerKey = key(player.canonical);
        names.add(playerKey);
        if (tableByName.has(playerKey)) continue;
        const entry = rosterOnlyPlayers.get(playerKey) ?? {
          nickname: player.canonical,
          occurrences: [],
        };
        entry.occurrences.push({
          roundNumber: match.roundNumber,
          expectedOutcome,
        });
        rosterOnlyPlayers.set(playerKey, entry);
      }
    }
    rosterNamesByRound.set(match.roundNumber, names);
  }
  for (const entry of rosterOnlyPlayers.values()) {
    const candidates = seasonData.table.participants
      .filter((row) =>
        entry.occurrences.every(
          ({ roundNumber, expectedOutcome }) =>
            outcome(row.rounds[roundNumber - 1]) === expectedOutcome &&
            !rosterNamesByRound
              .get(roundNumber)
              ?.has(key(row.canonical)),
        ),
      )
      .map((row) => ({
        nickname: row.canonical,
        extraResults:
          row.rounds.map(outcome).filter(Boolean).length -
          entry.occurrences.length,
      }))
      .sort(
        (left, right) =>
          left.extraResults - right.extraResults ||
          left.nickname.localeCompare(right.nickname, "ru"),
      );
    if (!candidates.length) continue;
    const bestScore = candidates[0].extraResults;
    const best = candidates
      .filter((candidate) => candidate.extraResults === bestScore)
      .slice(0, 3);
    if (
      entry.occurrences.length < 2 &&
      !best.some(
        (candidate) =>
          levenshtein(entry.nickname, candidate.nickname) <= 2,
      )
    ) {
      continue;
    }
    aliasCandidates.push({
      season,
      historical: entry.nickname,
      candidates: best.map((candidate) => candidate.nickname),
      rounds: [
        ...new Set(
          entry.occurrences.map((occurrence) => occurrence.roundNumber),
        ),
      ],
    });
  }
  for (const row of seasonData.table.participants) {
    const fires =
      seasonData.table.fires.find((entry) => key(entry.canonical) === key(row.canonical))?.total ?? 0;
    const penaltyPoints = -Math.min(4, Math.floor(fires / 5));
    const manualRemainder = row.pointsP - penaltyPoints;
    if (manualRemainder) {
      adjustmentSources.push({
        season,
        nickname: row.canonical,
        amount: manualRemainder,
        kind: "manual",
        reason: "Остаток столбца p после учёта штрафных огоньков из Excel",
      });
      discrepancy.push(
        `Сезон ${season}: у ${row.nickname} столбец p содержит отдельную ручную поправку ${manualRemainder > 0 ? "+" : ""}${manualRemainder}, которая не объясняется только таблицей огоньков.`,
      );
    }
    if (row.activityPoints) {
      adjustmentSources.push({
        season,
        nickname: row.canonical,
        amount: row.activityPoints,
        kind: "activity",
        reason: "Базовые очки активности +ap из Excel",
      });
    }
    if (row.games !== row.wins + row.draws + row.losses) {
      discrepancy.push(`Сезон ${season}: у ${row.nickname} G=${row.games}, но В+Н+П=${row.wins + row.draws + row.losses}.`);
    }
    const expectedRating = row.wins * 2 + row.draws + row.pointsP + row.activityPoints;
    if (row.rating !== expectedRating) {
      discrepancy.push(`Сезон ${season}: у ${row.nickname} R=${row.rating}, расчёт по В/Н/p/+ap даёт ${expectedRating}.`);
    }
    const symbols = row.rounds.map(outcome).filter(Boolean);
    if (symbols.length !== row.games) {
      discrepancy.push(`Сезон ${season}: у ${row.nickname} сыграно G=${row.games}, но заполнено результатов по турам ${symbols.length}.`);
    }
    const matchSummary = historicalMatchOutcomeSummary({
      aliases: currentAliases,
      key,
      matches: seasonData.regularMatches,
      participant: row,
    });
    if (
      matchSummary.wins !== row.wins ||
      matchSummary.draws !== row.draws ||
      matchSummary.losses !== row.losses
    ) {
      discrepancy.push(
        `Сезон ${season}: у ${row.nickname} итоговая таблица В/Н/П=${row.wins}/${row.draws}/${row.losses}, а найденные составы туров дают ${matchSummary.wins}/${matchSummary.draws}/${matchSummary.losses}. На сайте сохранены цифры итоговой таблицы.`,
      );
    }
  }
  for (const fire of seasonData.table.fires) {
    penaltySources.push({
      season,
      nickname: fire.canonical,
      fires: fire.total,
      stages: fire.stages,
    });
  }
  for (const match of seasonData.finalMatches) {
    for (const [side, players] of [["a", match.teamA], ["b", match.teamB]]) {
      for (const [index, player] of players.entries()) {
        finalistSources.push({
          season,
          nickname: player.canonical,
          seed:
            (match.lobbyOrder - 1) * 10 +
            (side === "a" ? 0 : 5) +
            index +
            1,
          medal: match.result
            ? (match.result === "team_a") === (side === "a") ? "gold" : "silver"
            : null,
        });
      }
    }
    if (!match.result) {
      discrepancy.push(`Сезон ${season}, ${match.title}: в Excel нет результата финального матча, поэтому медали пока не назначены.`);
    }
  }
}


await writeHistoricalSeasonImport({
  participantSources, seasons, metadata, discrepancy, unknownOccurrences,
  aliasMappings, aliasCandidates, matchSources, adjustmentSources, penaltySources,
  roundSources, finalistSources, sqlPath, reportPath,
  livePlayersPath,
});
