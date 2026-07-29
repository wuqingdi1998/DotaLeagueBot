export function parseHistoricalSeasonWorkbooks(workbooks, helpers) {
  const { clean, key, numberOr, role, canonical, outcome } = helpers;
function parseTable(workbook) {
  const rows = workbook.Sheets[0].Rows;
  const header = rows[0];
  const apIndex = header.findIndex((value) => key(value) === "+ap");
  const wrIndex = header.findIndex((value) => key(value) === "%wr");
  const inactiveTitle = rows.findIndex((row) =>
    key(row[1]).includes("игроки вне общей"),
  );
  const secondHeader = rows.findIndex(
    (row, index) => index > inactiveTitle && clean(row[2]) === "R",
  );
  const fireTitle = rows.findIndex((row) =>
    key(row[1]).includes("штраф очков"),
  );
  const firstRoundColumn = apIndex >= 0 ? apIndex + 1 : 8;
  const normalizeWinRate = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
      ? parsed
      : null;
  };
  const makeRow = (row, section, order) => ({
    nickname: clean(row[1]),
    canonical: canonical(workbook.Season, row[1]),
    rank:
      Number.isInteger(Number(row[0])) && Number(row[0]) > 0
        ? Number(row[0])
        : order,
    section,
    rating: numberOr(row[2]),
    games: numberOr(row[3]),
    wins: numberOr(row[4]),
    draws: numberOr(row[5]),
    losses: numberOr(row[6]),
    pointsP: numberOr(row[7]),
    activityPoints: apIndex >= 0 ? numberOr(row[apIndex]) : 0,
    rounds: row.slice(firstRoundColumn, wrIndex),
    winRate: normalizeWinRate(row[wrIndex]),
  });
  const active = rows
    .slice(1, inactiveTitle)
    .filter((row) => clean(row[1]) && Number.isFinite(Number(row[2])))
    .map((row, index) => makeRow(row, "active", index + 1));
  const inactive = rows
    .slice(secondHeader + 1, fireTitle)
    .filter((row) => clean(row[1]) && Number.isFinite(Number(row[2])))
    .map((row, index) => makeRow(row, "inactive", index + 1));
  const fires = rows
    .slice(fireTitle + 2)
    .map((row) => ({
      nickname: clean(row[1]),
      canonical: canonical(workbook.Season, row[1]),
      stages: row.slice(2, 6).map((value) =>
        value == null ? null : Number(value),
      ),
    }))
    .filter(
      (entry) =>
        entry.nickname && entry.stages.some((value) => Number.isFinite(value)),
    )
    .map((entry) => ({
      ...entry,
      total: entry.stages
        .filter((value) => Number.isFinite(value))
        .reduce((sum, value) => sum + value, 0),
    }));
  return {
    header,
    legend: clean(header[wrIndex + 1]),
    roundDates: header.slice(firstRoundColumn, wrIndex),
    participants: [...active, ...inactive],
    fires,
    hasActivityPoints: apIndex >= 0,
  };
}

function parseRound(season, sheet, roundNumber, table) {
  const rows = sheet.Rows;
  const tiers = new Map(
    rows
      .map((row) => [
        key(canonical(season, row[0])),
        { tier: numberOr(row[1], NaN), roles: role(row[2]) },
      ])
      .filter(([, value]) => Number.isInteger(value.tier)),
  );
  const lobbies = [];
  for (let rowIndex = 0; rowIndex < rows.length - 2; rowIndex += 1) {
    const headerColumn = rows[rowIndex].findIndex(
      (value) => /лобби/i.test(clean(value)) && !/резерв/i.test(clean(value)),
    );
    if (headerColumn < 0) continue;
    const title = clean(rows[rowIndex][headerColumn]);
    const teamAName = clean(rows[rowIndex + 1]?.[headerColumn]);
    const rightColumn =
      [headerColumn + 4, headerColumn + 5, headerColumn + 3]
        .map((column) => ({
          column,
          playerRows: rows
            .slice(rowIndex + 2, rowIndex + 7)
            .filter(
              (row) =>
                clean(row[column]) &&
                !Number.isFinite(Number(row[column])) &&
                Number.isInteger(numberOr(row[column + 1], NaN)),
            ).length,
        }))
        .sort((left, right) => right.playerRows - left.playerRows)[0]
        ?.column ?? headerColumn + 4;
    const teamBName = clean(rows[rowIndex + 1]?.[rightColumn]);
    if (!teamAName || !teamBName) continue;
    const readTeam = (column) =>
      rows.slice(rowIndex + 2, rowIndex + 7).map((row) => ({
        nickname: clean(row[column]),
        canonical: canonical(season, row[column]),
        tier: numberOr(row[column + 1], NaN),
        roles: role(row[column + 2]),
      }));
    const teamA = readTeam(headerColumn);
    const teamB = readTeam(rightColumn);
    const tableByName = new Map(
      table.participants.map((participant) => [
        key(participant.canonical),
        participant,
      ]),
    );
    const sideOutcome = (players) => {
      const values = players
        .map((player) =>
          outcome(
            tableByName.get(key(player.canonical))?.rounds[roundNumber - 1],
          ),
        )
        .filter(Boolean);
      return ["win", "draw", "loss"].sort(
        (left, right) =>
          values.filter((value) => value === right).length -
          values.filter((value) => value === left).length,
      )[0];
    };
    const sideA = sideOutcome(teamA);
    const sideB = sideOutcome(teamB);
    const titleKey = key(title);
    let result =
      sideA === "win" && sideB === "loss"
        ? "team_a"
        : sideA === "loss" && sideB === "win"
          ? "team_b"
          : sideA === "draw" && sideB === "draw"
            ? "draw"
            : null;
    if (titleKey.includes("ничья")) result = "draw";
    if (titleKey.includes("победа")) {
      const winner = titleKey.split("победа")[1].replace(/[()\-]/g, "").trim();
      if (key(teamAName).includes(winner)) result = "team_a";
      if (key(teamBName).includes(winner)) result = "team_b";
    }
    const time = title.match(/\b([01]\d|2[0-3]):[0-5]\d\b/)?.[0] ?? "20:00";
    lobbies.push({
      roundNumber,
      lobbyOrder: lobbies.length + 1,
      title: title.replace(/\s*\([^)]*\)\s*$/, ""),
      teamAName,
      teamBName,
      teamATierSum: numberOr(rows[rowIndex + 1]?.[headerColumn + 1], NaN),
      teamBTierSum: numberOr(rows[rowIndex + 1]?.[rightColumn + 1], NaN),
      teamA,
      teamB,
      result,
      teamAScore: result === "team_a" ? 2 : result === "team_b" ? 0 : result === "draw" ? 1 : null,
      teamBScore: result === "team_b" ? 2 : result === "team_a" ? 0 : result === "draw" ? 1 : null,
      time,
      tierDifferences: [...teamA, ...teamB]
        .map((player) => {
          const listed = tiers.get(key(player.canonical))?.tier;
          return Number.isInteger(listed) && listed !== player.tier
            ? { nickname: player.nickname, roster: player.tier, list: listed }
            : null;
        })
        .filter(Boolean),
    });
  }
  return lobbies;
}

function parseFinals(workbook) {
  const rows = workbook.Sheets.at(-1).Rows;
  const matches = [];
  for (let rowIndex = 0; rowIndex < rows.length - 2; rowIndex += 1) {
    const headerColumn = rows[rowIndex].findIndex((value) =>
      /(финал|лобби)/i.test(clean(value)),
    );
    if (headerColumn < 0) continue;
    const title = clean(rows[rowIndex][headerColumn]);
    const rightColumn =
      [headerColumn + 4, headerColumn + 3]
        .map((column) => ({
          column,
          playerRows: rows
            .slice(rowIndex + 2, rowIndex + 7)
            .filter(
              (row) =>
                clean(row[column]) &&
                !Number.isFinite(Number(row[column])) &&
                Number.isInteger(numberOr(row[column + 1], NaN)),
            ).length,
        }))
        .sort((left, right) => right.playerRows - left.playerRows)[0]
        ?.column ?? headerColumn + 4;
    const readTeam = (column) =>
      rows.slice(rowIndex + 2, rowIndex + 7).map((row) => ({
        nickname: clean(row[column]),
        canonical: canonical(workbook.Season, row[column]),
        tier: numberOr(row[column + 1], NaN),
        roles: role(row[column + 2]),
      }));
    const score = title.match(
      /([0-9]+)\s*:\s*([0-9]+)\s+победа\s+/i,
    );
    const teamAName = clean(rows[rowIndex + 1]?.[headerColumn]) || "Команда A";
    const teamBName = clean(rows[rowIndex + 1]?.[rightColumn]) || "Команда B";
    const winnerText = key(title.split(/победа/i)[1]);
    const result = !score
      ? null
      : winnerText.includes(key(teamAName))
        ? "team_a"
        : winnerText.includes(key(teamBName))
          ? "team_b"
          : Number(score[1]) > Number(score[2])
            ? "team_a"
            : "team_b";
    const time = title.match(/\b([01]\d|2[0-3]):[0-5]\d\b/)?.[0] ?? "20:00";
    const teamA = readTeam(headerColumn);
    const teamB = readTeam(rightColumn);
    if (
      teamA.some((player) => !player.nickname) ||
      teamB.some((player) => !player.nickname)
    ) {
      throw new Error(
        `Сезон ${workbook.Season}: не удалось прочитать по 5 игроков в финале «${title}»`,
      );
    }
    matches.push({
      roundNumber: 15,
      lobbyOrder: matches.length + 1,
      title: title.split(/[-(]/)[0].trim(),
      teamAName,
      teamBName,
      teamATierSum: numberOr(rows[rowIndex + 1]?.[headerColumn + 1], NaN),
      teamBTierSum: numberOr(rows[rowIndex + 1]?.[rightColumn + 1], NaN),
      teamA,
      teamB,
      result,
      teamAScore: score ? Number(score[1]) : null,
      teamBScore: score ? Number(score[2]) : null,
      time,
      tierDifferences: [],
    });
  }
  return matches;
}

return workbooks.map((workbook) => {
  const table = parseTable(workbook);
  const rounds = workbook.Sheets.slice(1, -1).flatMap((sheet, index) =>
    parseRound(workbook.Season, sheet, index + 1, table),
  );
  return {
    season: workbook.Season,
    table,
    regularMatches: rounds,
    finalMatches: parseFinals(workbook),
  };
});

}
