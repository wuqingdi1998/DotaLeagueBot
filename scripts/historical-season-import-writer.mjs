import fs from "node:fs";
import path from "node:path";

export async function writeHistoricalSeasonImport({
  participantSources, seasons, metadata, discrepancy, unknownOccurrences,
  aliasMappings, aliasCandidates, matchSources, adjustmentSources, penaltySources,
  roundSources, finalistSources, sqlPath, reportPath, livePlayersPath,
}) {
  const clean = (value) =>
    String(value ?? "").replace(/\s+/g, " ").trim();
  const key = (value) =>
    clean(value).toLocaleLowerCase("ru").replace(/[’`]/g, "'");
  const participantPage = livePlayersPath
    ? ""
    : await fetch("https://lsesports.ru/participants").then(
        (response) => response.text(),
      );
  const livePlayers = livePlayersPath
    ? JSON.parse(fs.readFileSync(livePlayersPath, "utf8"))
    : [...participantPage.matchAll(/href="\/players\/(\d+)"[\s\S]{0,500}?class="participant-name"[^>]*>([^<]+)</g)]
        .map((match) => ({ dotaId: match[1], nickname: clean(match[2]) }));
  const liveByName = new Map(livePlayers.map((player) => [key(player.nickname), player]));
  for (const participant of participantSources) {
    const live = liveByName.get(key(participant.linkedNickname));
    participant.linkedDotaId = live?.dotaId ?? null;
    if (!live) {
      const id = `${participant.season}|${key(participant.nickname)}`;
      unknownOccurrences.set(id, {
        season: participant.season,
        nickname: participant.nickname,
      });
    }
  }
  
  participantSources.forEach((participant, index) => {
    participant.archiveId = String(-8400000000000000n - BigInt(index + 1));
  });
  
  const json = (value, tag) => `$${tag}$\n${JSON.stringify(value)}\n$${tag}$::jsonb`;
  const sql = `DO $migration$
  DECLARE
      missing_links TEXT;
  BEGIN
      CREATE TEMP TABLE historical_season_players ON COMMIT DROP AS
      SELECT *
      FROM jsonb_to_recordset(${json(participantSources, "players")}) AS source(
        season INT, nickname TEXT, section TEXT, rank INT, reason TEXT,
        snapshot JSONB,
        "linkedNickname" TEXT, "linkedDotaId" TEXT, "archiveId" TEXT
      );
  
      INSERT INTO players (discord_id, steam_id32, ingame_name, real_name)
      SELECT "archiveId"::BIGINT, "archiveId"::BIGINT, nickname,
        'Архивная запись сезонной лиги — профиль не привязан'
      FROM historical_season_players
      WHERE "linkedDotaId" IS NULL
      ON CONFLICT (discord_id) DO NOTHING;
  
      SELECT STRING_AGG(source.nickname, ', ' ORDER BY source.nickname)
      INTO missing_links
      FROM historical_season_players source
      WHERE source."linkedDotaId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM players player
          WHERE player.steam_id32::TEXT = source."linkedDotaId"
        );
      IF missing_links IS NOT NULL THEN
        RAISE EXCEPTION 'Не найдены актуальные профили: %', missing_links;
      END IF;
  
      CREATE TEMP TABLE historical_season_player_map ON COMMIT DROP AS
      SELECT source.season, source.nickname,
        COALESCE(player.discord_id, source."archiveId"::BIGINT) AS player_id,
        source.section, source.rank, source.reason, source.snapshot
      FROM historical_season_players source
      LEFT JOIN players player
        ON source."linkedDotaId" IS NOT NULL
       AND player.steam_id32::TEXT = source."linkedDotaId";
  
      CREATE TEMP TABLE historical_season_tournaments ON COMMIT DROP AS
      SELECT * FROM jsonb_to_recordset(${json(
        seasons.map(({ season, table }) => ({
          season,
          slug: `league-season-${season}`,
          name: `Linken's Sphere eSports 5x5 League Season ${season}`,
          startAt: metadata[season].start,
          endAt: metadata[season].end,
          description: `Четырнадцать туров индивидуальной лиги, ${metadata[season].period}, и два финальных матча.`,
          participantCount: table.participants.length,
        })),
        "tournaments",
      )}) AS source(
        season INT, slug TEXT, name TEXT, "startAt" TIMESTAMPTZ,
        "endAt" TIMESTAMPTZ, description TEXT, "participantCount" INT
      );
  
      INSERT INTO tournaments (
        slug, name, eyebrow, headline, headline_accent, description, about,
        start_at, end_at, registration_deadline, status_label, format,
        team_size, max_teams, region, server, check_in_minutes,
        group_format, playoff_format, final_format, discord_url, status,
        tournament_type, season_round_count
      )
      SELECT slug, name, 'Архивный сезонный турнир',
        'Linken''s Sphere eSports 5x5 League', 'Season ' || season,
        description,
        'Исторические результаты перенесены из итоговых Excel-таблиц лиги. Победа приносит 2 очка, ничья — 1, поражение — 0.',
        "startAt", "endAt", "startAt" - INTERVAL '1 day',
        'Турнир завершён', 'Сезонная лига · 5 × 5 · BO2',
        5, 6, 'EU / RU', 'EU West', 60,
        '14 туров · верхнее, среднее и нижнее лобби', '',
        '2 финала · золотые и серебряные медали',
        'https://discord.gg/lsesports', 'archived', 'seasonal', 14
      FROM historical_season_tournaments
      ON CONFLICT (slug) DO NOTHING;
  
      CREATE TEMP TABLE historical_season_round_source ON COMMIT DROP AS
      SELECT * FROM jsonb_to_recordset(${json(roundSources, "rounds")}) AS source(
        season INT, "roundNumber" INT, name TEXT, kind TEXT,
        "scheduledAt" TIMESTAMPTZ, status TEXT
      );
      INSERT INTO season_rounds (
        tournament_id, round_number, name, status, scheduled_at,
        is_visible, round_kind
      )
      SELECT tournament.id, source."roundNumber", source.name, source.status,
        source."scheduledAt", TRUE, source.kind
      FROM historical_season_round_source source
      JOIN historical_season_tournaments season ON season.season = source.season
      JOIN tournaments tournament ON tournament.slug = season.slug
      ON CONFLICT (tournament_id, round_number) DO NOTHING;
  
    INSERT INTO season_participants (
      tournament_id, player_id, nickname_snapshot, standings_section,
      inactive_reason, rank_snapshot, standings_snapshot
    )
    SELECT selected.tournament_id, selected.player_id, selected.nickname,
      selected.section, selected.reason, selected.rank, selected.snapshot
    FROM (
      SELECT DISTINCT ON (tournament.id, player_map.player_id)
        tournament.id AS tournament_id, player_map.player_id,
        player_map.nickname, player_map.section, player_map.reason,
        player_map.rank, player_map.snapshot
      FROM historical_season_player_map player_map
      JOIN historical_season_tournaments season
        ON season.season = player_map.season
      JOIN tournaments tournament ON tournament.slug = season.slug
      ORDER BY tournament.id, player_map.player_id,
        CASE WHEN player_map.section = 'active' THEN 0 ELSE 1 END,
        player_map.rank
    ) selected
      ON CONFLICT (tournament_id, player_id) DO UPDATE SET
        nickname_snapshot = EXCLUDED.nickname_snapshot,
        standings_section = EXCLUDED.standings_section,
        inactive_reason = EXCLUDED.inactive_reason,
      rank_snapshot = EXCLUDED.rank_snapshot,
      standings_snapshot = EXCLUDED.standings_snapshot;
  
      CREATE TEMP TABLE historical_season_match_source ON COMMIT DROP AS
      SELECT * FROM jsonb_to_recordset(${json(matchSources, "matches")}) AS source(
        season INT, "roundNumber" INT, "lobbyOrder" INT, title TEXT,
        "teamAName" TEXT, "teamBName" TEXT, "teamA" JSONB, "teamB" JSONB,
        result TEXT, "teamAScore" INT, "teamBScore" INT, time TEXT,
        "scheduledAt" TIMESTAMPTZ, status TEXT, "tierDifferences" JSONB
      );
      INSERT INTO season_lobbies (
        round_id, name, sort_order, status, scheduled_at
      )
      SELECT round.id, source.title, source."lobbyOrder",
        CASE WHEN source.status = 'completed' THEN 'completed' ELSE 'scheduled' END,
        source."scheduledAt"
      FROM historical_season_match_source source
      JOIN historical_season_tournaments season ON season.season = source.season
      JOIN tournaments tournament ON tournament.slug = season.slug
      JOIN season_rounds round ON round.tournament_id = tournament.id
        AND round.round_number = source."roundNumber"
      ON CONFLICT (round_id, sort_order) DO NOTHING;
  
      INSERT INTO season_matches (
        lobby_id, scheduled_at, team_a_name, team_b_name, best_of,
        team_a_score, team_b_score, result, status, sort_order
      )
      SELECT lobby.id, source."scheduledAt", source."teamAName",
        source."teamBName", 2, source."teamAScore", source."teamBScore",
        source.result, source.status, 1
      FROM historical_season_match_source source
      JOIN historical_season_tournaments season ON season.season = source.season
      JOIN tournaments tournament ON tournament.slug = season.slug
      JOIN season_rounds round ON round.tournament_id = tournament.id
        AND round.round_number = source."roundNumber"
      JOIN season_lobbies lobby ON lobby.round_id = round.id
        AND lobby.sort_order = source."lobbyOrder"
      ON CONFLICT (lobby_id, sort_order) DO NOTHING;
  
      INSERT INTO season_match_participants (
        match_id, player_id, nickname_snapshot, team_side,
        is_captain, tier_snapshot
      )
      SELECT match.id, player_map.player_id, player_data.value->>'nickname',
        player_data.team_side, FALSE,
        NULLIF(player_data.value->>'tier', 'null')::INT
      FROM historical_season_match_source source
      JOIN historical_season_tournaments season ON season.season = source.season
      JOIN tournaments tournament ON tournament.slug = season.slug
      JOIN season_rounds round ON round.tournament_id = tournament.id
        AND round.round_number = source."roundNumber"
      JOIN season_lobbies lobby ON lobby.round_id = round.id
        AND lobby.sort_order = source."lobbyOrder"
      JOIN season_matches match ON match.lobby_id = lobby.id
        AND match.sort_order = 1
      CROSS JOIN LATERAL (
        SELECT value, 'a'::CHAR(1) AS team_side
        FROM jsonb_array_elements(source."teamA")
        UNION ALL
        SELECT value, 'b'::CHAR(1) AS team_side
        FROM jsonb_array_elements(source."teamB")
      ) player_data
      JOIN historical_season_player_map player_map
        ON player_map.season = source.season
       AND LOWER(player_map.nickname) = LOWER(player_data.value->>'canonical')
      ON CONFLICT (match_id, player_id) DO NOTHING;
  
      CREATE TEMP TABLE historical_season_adjustment_source ON COMMIT DROP AS
      SELECT * FROM jsonb_to_recordset(${json(adjustmentSources, "adjustments")}) AS source(
        season INT, nickname TEXT, amount INT, kind TEXT, reason TEXT
      );
      INSERT INTO season_point_adjustments (
        tournament_id, player_id, amount, reason, adjustment_kind
      )
      SELECT tournament.id, player_map.player_id, source.amount,
        source.reason, source.kind
      FROM historical_season_adjustment_source source
      JOIN historical_season_player_map player_map
        ON player_map.season = source.season
       AND LOWER(player_map.nickname) = LOWER(source.nickname)
      JOIN historical_season_tournaments season ON season.season = source.season
      JOIN tournaments tournament ON tournament.slug = season.slug;
  
      CREATE TEMP TABLE historical_season_penalty_source ON COMMIT DROP AS
      SELECT * FROM jsonb_to_recordset(${json(penaltySources, "penalties")}) AS source(
        season INT, nickname TEXT, fires INT, stages JSONB
      );
      INSERT INTO season_penalty_events (
        tournament_id, player_id, round_id, fire_count, note
      )
      SELECT tournament.id, player_map.player_id, round.id, source.fires,
        'Перенесено из итоговой таблицы Excel; исходные ячейки: ' || source.stages::TEXT
      FROM historical_season_penalty_source source
      JOIN historical_season_player_map player_map
        ON player_map.season = source.season
       AND LOWER(player_map.nickname) = LOWER(source.nickname)
      JOIN historical_season_tournaments season ON season.season = source.season
      JOIN tournaments tournament ON tournament.slug = season.slug
      JOIN season_rounds round ON round.tournament_id = tournament.id
        AND round.round_number = 14
      ON CONFLICT (tournament_id, player_id, round_id) DO UPDATE SET
        fire_count = EXCLUDED.fire_count, note = EXCLUDED.note, updated_at = NOW();
  
      CREATE TEMP TABLE historical_season_finalist_source ON COMMIT DROP AS
      SELECT * FROM jsonb_to_recordset(${json(finalistSources, "finalists")}) AS source(
        season INT, nickname TEXT, seed INT, medal TEXT
      );
      INSERT INTO season_finalists (
        tournament_id, player_id, seed, medal, note
      )
      SELECT tournament.id, player_map.player_id, source.seed, source.medal,
        CASE WHEN source.medal IS NULL
          THEN 'Финалист из Excel; результат финала не указан'
          ELSE 'Медаль по результату финала из Excel' END
      FROM historical_season_finalist_source source
      JOIN historical_season_player_map player_map
        ON player_map.season = source.season
       AND LOWER(player_map.nickname) = LOWER(source.nickname)
      JOIN historical_season_tournaments season ON season.season = source.season
      JOIN tournaments tournament ON tournament.slug = season.slug
      ON CONFLICT (tournament_id, player_id) DO UPDATE SET
        seed = EXCLUDED.seed, medal = EXCLUDED.medal, note = EXCLUDED.note;
  
      INSERT INTO tournament_season_facts (
        tournament_id, sort_order, value_text, label
      )
      SELECT tournament.id, fact.sort_order, fact.value_text, fact.label
      FROM historical_season_tournaments season
      JOIN tournaments tournament ON tournament.slug = season.slug
      CROSS JOIN (VALUES
        (1, '14', 'Всего туров в сезоне'),
        (2, '14', 'Опубликовано организатором')
      ) fact(sort_order, value_text, label)
      ON CONFLICT (tournament_id, sort_order) DO NOTHING;
  END
  $migration$;
  `;
  
  fs.writeFileSync(sqlPath, sql, "utf8");
  
  const unknown = [...unknownOccurrences.values()].sort(
    (left, right) => left.season - right.season || left.nickname.localeCompare(right.nickname, "ru"),
  );
  const report = [
    "# Проверка исторических сезонов 4–7",
    "",
    "## Ники, для которых не найден профиль на сайте",
    "",
    ...Object.keys(metadata).flatMap((season) => {
      const names = unknown.filter((entry) => entry.season === Number(season));
      return [`### Сезон ${season}`, "", names.length ? names.map((entry) => `- ${entry.nickname}`).join("\n") : "- Все ники распознаны.", ""];
    }),
    "## Связанные исторические ники",
    "",
    ...aliasMappings
      .sort((left, right) => left.season - right.season || left.historical.localeCompare(right.historical, "ru"))
      .map((entry) => `- Сезон ${entry.season}: ${entry.historical} → ${entry.current}`),
    "",
    "## Возможные прежние ники, которые нужно подтвердить",
    "",
    ...aliasCandidates
      .sort((left, right) => left.season - right.season || left.historical.localeCompare(right.historical, "ru"))
      .map(
        (entry) =>
          `- Сезон ${entry.season}: ${entry.historical} → ${entry.candidates.join(" / ")}; совпадают результаты в турах ${entry.rounds.join(", ")}.`,
      ),
    "",
    "## Несостыковки и вопросы по данным",
    "",
    ...[...new Set(discrepancy)].map((entry) => `- ${entry}`),
    "",
    "## Принятые временные допущения",
    "",
    "- Для сезона 4 точная дата финалов в Excel не указана: временно установлено 5 мая 2024 года.",
    "- Для сезона 5 точная дата финалов в Excel не указана: временно установлено 8 декабря 2024 года.",
    "- В сезоне 4 таблица огоньков имеет старый формат 6/5/4/3/2/1. На сайте сохранена сумма исходных ячеек, а итоговый столбец p выровнен по Excel.",
    "- Если в заголовке тура не было времени, установлено 20:00 по Москве.",
    "- В сезонах 5–7 в Excel нет счёта финалов. Финалисты внесены, но медали не назначены до уточнения результатов.",
    "",
  ].join("\n");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, "utf8");
  
  console.log(JSON.stringify({
    seasons: seasons.map((entry) => ({
      season: entry.season,
      participants: participantSources.filter((source) => source.season === entry.season).length,
      regularMatches: entry.regularMatches.length,
      finalMatches: entry.finalMatches.length,
    })),
    unknown: unknown.length,
    discrepancies: new Set(discrepancy).size,
    unresolvedRegularMatches: matchSources.filter(
      (match) => match.roundNumber <= 14 && !match.result,
    ).length,
    unresolvedFinalMatches: matchSources.filter(
      (match) => match.roundNumber === 15 && !match.result,
    ).length,
    incompleteRosters: matchSources.filter(
      (match) =>
        match.teamA.filter((player) => player.nickname).length !== 5 ||
        match.teamB.filter((player) => player.nickname).length !== 5,
    ).length,
    sqlBytes: Buffer.byteLength(sql),
  }, null, 2));
}
