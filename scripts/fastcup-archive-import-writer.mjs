import fs from "node:fs";

import {
  buildDotaIdRegistry,
  dotaIdFor,
} from "./fastcup-archive-identities.mjs";
import {
  buildFastcupReport,
  fetchLivePlayers,
} from "./fastcup-archive-report.mjs";

const json = (value, tag) =>
  `$${tag}$\n${JSON.stringify(value)}\n$${tag}$::jsonb`;

const teamCountText = (count) =>
  `${count} ${count === 1 ? "команда" : count >= 2 && count <= 4 ? "команды" : "команд"}`;

const flattenImportData = (tournaments) => {
  const teams = [];
  const rosters = [];
  const groups = [];
  const groupOrders = [];
  const matches = [];
  const rules = [];
  const schedules = [];
  const archiveIds = new Map();
  const dotaIdRegistry = buildDotaIdRegistry(tournaments);
  const archiveIdFor = (player, dotaId) => {
    const identityKey = dotaId ? `dota:${dotaId}` : `nick:${player.linkedNickname.toLocaleLowerCase("ru")}`;
    if (!archiveIds.has(identityKey)) {
      archiveIds.set(
        identityKey,
        String(-8600000000010000n - BigInt(archiveIds.size + 1)),
      );
    }
    return archiveIds.get(identityKey);
  };

  for (const tournament of tournaments) {
    for (const team of tournament.teams) {
      teams.push({
        slug: tournament.metadata.slug,
        seed: team.seed,
        teamName: team.teamName,
        tag: team.tag,
        tierTotal: team.tierTotal ?? null,
        placement: team.placement ?? null,
        resultLabel: team.resultLabel ?? "Участник",
        prizeText: team.prizeText ?? null,
        selectionMethod: team.selectionMethod,
      });
      for (const player of team.players) {
        const dotaId = dotaIdFor(player, dotaIdRegistry);
        rosters.push({
          slug: tournament.metadata.slug,
          teamName: team.teamName,
          nickname: player.nickname,
          linkedNickname: player.linkedNickname,
          dotaId,
          role: player.role,
          tier: player.tier,
          isCaptain: player.isCaptain,
          sortOrder: player.sortOrder,
          archiveId: archiveIdFor(player, dotaId),
        });
      }
    }
    groupOrders.push(
      ...tournament.groupOrder.map((entry) => ({
        slug: tournament.metadata.slug,
        ...entry,
      })),
    );
    const groupNames = [...new Set(tournament.groupOrder.map((entry) => entry.groupName))];
    groups.push(...groupNames.map((groupName, index) => ({
      slug: tournament.metadata.slug,
      groupName,
      sortOrder: index + 1,
      teamCapacity: tournament.groupOrder.filter((entry) => entry.groupName === groupName).length,
      advanceToPlayoff: tournament.metadata.advanceToPlayoff,
    })));
    matches.push(
      ...tournament.matches.map((match) => ({
        slug: tournament.metadata.slug,
        ...match,
      })),
    );
    rules.push(
      ...tournament.rules.map((ruleText, index) => ({
        slug: tournament.metadata.slug,
        sortOrder: index + 1,
        ruleText,
      })),
    );
    const dayOrders = new Map();
    for (const schedule of tournament.metadata.schedules) {
      if (!dayOrders.has(schedule[0])) dayOrders.set(schedule[0], dayOrders.size + 1);
      const dayOrder = dayOrders.get(schedule[0]);
      const entryOrder = schedules.filter(
        (entry) => entry.slug === tournament.metadata.slug && entry.dayOrder === dayOrder,
      ).length + 1;
      schedules.push({
        slug: tournament.metadata.slug,
        dayDate: schedule[0],
        dayTitle: schedule[1],
        dayOrder,
        startTime: schedule[2],
        stageName: schedule[3],
        matchCount: schedule[4],
        seriesFormat: schedule[5],
        entryOrder,
      });
    }
  }
  return { teams, rosters, groups, groupOrders, matches, rules, schedules };
};

const tournamentSource = (tournaments) =>
  tournaments.map((tournament) => ({
    slug: tournament.metadata.slug,
    name: tournament.name,
    description: `${teamCountText(tournament.teams.length)}, групповой этап и плей-офф по результатам таблицы турнира.`,
    about: `Captain's Mode. ${tournament.metadata.mmrLimit
      ? `Сумма ММР пяти игроков — не более ${tournament.metadata.mmrLimit}`
      : `Сумма тиров пяти игроков — не более ${tournament.metadata.tierLimit}`}, минимальный ранг — Герой.${tournament.metadata.participationNote ? ` ${tournament.metadata.participationNote}` : ""}`,
    startAt: tournament.metadata.startAt,
    endAt: tournament.metadata.endAt,
    registrationDeadline: tournament.metadata.registrationDeadline,
    maxTeams: tournament.metadata.maxTeams,
    groupFormat: tournament.metadata.groupFormat,
    playoffFormat: tournament.metadata.playoffFormat,
    finalFormat: tournament.metadata.finalFormat,
    advanceToPlayoff: tournament.metadata.advanceToPlayoff,
  }));

const buildSql = (tournaments, data) => `-- Файл сформирован scripts/generate-fastcup-archive-import.mjs.
-- Справочные листы игроков использованы только для данных составов и идентификации профилей.
CREATE TEMP TABLE imported_fastcups ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset(${json(tournamentSource(tournaments), "tournaments")}) AS source(
  slug TEXT, name TEXT, description TEXT, about TEXT,
  "startAt" TIMESTAMPTZ, "endAt" TIMESTAMPTZ,
  "registrationDeadline" TIMESTAMPTZ, "maxTeams" SMALLINT,
  "groupFormat" TEXT, "playoffFormat" TEXT, "finalFormat" TEXT,
  "advanceToPlayoff" SMALLINT
);

INSERT INTO tournaments (
  slug, name, eyebrow, headline, headline_accent, description, about,
  start_at, end_at, registration_deadline, status_label, format,
  team_size, max_teams, region, server, check_in_minutes,
  group_format, playoff_format, final_format, discord_url, status,
  playoff_type
)
SELECT
  source.slug, source.name, 'Архивный турнир', source.name,
  TO_CHAR(source."startAt" AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY')
    || ' — ' || TO_CHAR(source."endAt" AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY'),
  source.description, source.about, source."startAt", source."endAt",
  source."registrationDeadline", 'Турнир завершён',
  'Captain''s Mode · 5 × 5', 5, source."maxTeams", '', 'Stockholm', 60,
  source."groupFormat", source."playoffFormat", source."finalFormat",
  'https://discord.gg/lsesports', 'archived', 'single_elimination'
FROM imported_fastcups source
ON CONFLICT (slug) DO NOTHING;

CREATE TEMP TABLE imported_fastcup_teams ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset(${json(data.teams, "teams")}) AS source(
  slug TEXT, seed SMALLINT, "teamName" TEXT, tag TEXT, "tierTotal" SMALLINT,
  placement SMALLINT, "resultLabel" TEXT, "prizeText" TEXT,
  "selectionMethod" TEXT
);

INSERT INTO tournament_team_applications (
  tournament_id, team_name, tag, captain_discord_id, contact, logo_key,
  status, selection_method, captain_name_snapshot, team_tier_total_snapshot,
  created_at
)
SELECT
  tournament.id, source."teamName", source.tag, NULL, 'Архив', '',
  'approved', source."selectionMethod", NULL, source."tierTotal",
  tournament.start_at - INTERVAL '1 day' + source.seed * INTERVAL '1 minute'
FROM imported_fastcup_teams source
JOIN tournaments tournament ON tournament.slug = source.slug
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_team_applications application
  WHERE application.tournament_id = tournament.id
    AND application.team_name = source."teamName"
);

CREATE TEMP TABLE imported_fastcup_rosters ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset(${json(data.rosters, "rosters")}) AS source(
  slug TEXT, "teamName" TEXT, nickname TEXT, "linkedNickname" TEXT,
  "dotaId" TEXT, role TEXT, tier SMALLINT, "isCaptain" BOOLEAN,
  "sortOrder" SMALLINT, "archiveId" TEXT
);

CREATE TEMP TABLE imported_fastcup_player_resolutions ON COMMIT DROP AS
SELECT
  source."archiveId"::BIGINT AS archive_id,
  MIN(source.nickname) AS archive_nickname,
  MIN(source."dotaId"::BIGINT) AS archive_dota_id,
  CASE WHEN COUNT(DISTINCT candidate.player_id) = 1
    THEN MIN(candidate.player_id) END AS registered_player_id
FROM imported_fastcup_rosters source
LEFT JOIN LATERAL (
  SELECT COALESCE(identity.registered_player_id, MIN(member.player_id)) AS player_id
  FROM player_identities identity
  JOIN player_identity_members member ON member.identity_id = identity.id
  WHERE EXISTS (
    SELECT 1
    FROM player_identity_members identity_member
    JOIN players identity_player ON identity_player.discord_id = identity_member.player_id
    WHERE identity_member.identity_id = identity.id
      AND (
        (source."dotaId" IS NOT NULL AND (
          identity_player.steam_id32::TEXT = source."dotaId"
          OR identity_player.archived_steam_id32::TEXT = source."dotaId"
        ))
        OR LOWER(BTRIM(identity_member.nickname_snapshot)) =
          LOWER(BTRIM(source."linkedNickname"))
        OR EXISTS (
          SELECT 1 FROM player_nickname_history history
          WHERE history.player_id = identity_member.player_id
            AND history.nickname_key = LOWER(BTRIM(source."linkedNickname"))
        )
        OR EXISTS (
          SELECT 1 FROM tournament_roster_snapshots snapshot
          WHERE snapshot.player_id = identity_member.player_id
            AND LOWER(BTRIM(snapshot.nickname_snapshot)) =
              LOWER(BTRIM(source."linkedNickname"))
        )
      )
  )
  GROUP BY identity.id, identity.registered_player_id
) candidate ON TRUE
GROUP BY source."archiveId";

INSERT INTO players (
  discord_id, steam_id32, archived_steam_id32, ingame_name, real_name,
  is_archived, archived_at
)
SELECT
  resolution.archive_id, nextval('archived_player_steam_id_seq'),
  resolution.archive_dota_id, resolution.archive_nickname,
  'Архивная запись LS Fastcup — профиль не привязан', TRUE, NOW()
FROM imported_fastcup_player_resolutions resolution
WHERE resolution.registered_player_id IS NULL
ON CONFLICT (discord_id) DO NOTHING;

INSERT INTO tournament_roster_snapshots (
  application_id, player_id, nickname_snapshot, role,
  tier_snapshot, is_captain, sort_order
)
SELECT
  application.id,
  COALESCE(resolution.registered_player_id, resolution.archive_id),
  source.nickname, source.role, source.tier,
  source."isCaptain", source."sortOrder"
FROM imported_fastcup_rosters source
JOIN imported_fastcup_player_resolutions resolution
  ON resolution.archive_id = source."archiveId"::BIGINT
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_team_applications application
  ON application.tournament_id = tournament.id
 AND application.team_name = source."teamName"
ON CONFLICT (application_id, role) DO NOTHING;

CREATE TEMP TABLE imported_fastcup_groups ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset(${json(data.groups, "groups")}) AS source(
  slug TEXT, "groupName" TEXT, "sortOrder" SMALLINT,
  "teamCapacity" SMALLINT, "advanceToPlayoff" SMALLINT
);

INSERT INTO tournament_groups (
  tournament_id, name, sort_order, team_capacity,
  advance_to_playoff, advance_to_upper, advance_to_lower, explanation
)
SELECT
  tournament.id, source."groupName", source."sortOrder", source."teamCapacity",
  source."advanceToPlayoff", 0, 0,
  'Итоговые места определялись по числу выигранных карт и правилам тай-брейка турнира.'
FROM imported_fastcup_groups source
JOIN tournaments tournament ON tournament.slug = source.slug
ON CONFLICT (tournament_id, name) DO NOTHING;

CREATE TEMP TABLE imported_fastcup_group_order ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset(${json(data.groupOrders, "group_order")}) AS source(
  slug TEXT, "teamName" TEXT, "sortOrder" SMALLINT, "groupName" TEXT
);

INSERT INTO tournament_group_teams (group_id, application_id, sort_order)
SELECT tournament_group.id, application.id, source."sortOrder"
FROM imported_fastcup_group_order source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_groups tournament_group
  ON tournament_group.tournament_id = tournament.id
 AND tournament_group.name = source."groupName"
JOIN tournament_team_applications application
  ON application.tournament_id = tournament.id
 AND application.team_name = source."teamName"
ON CONFLICT (group_id, application_id) DO NOTHING;

CREATE TEMP TABLE imported_fastcup_matches ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset(${json(data.matches, "matches")}) AS source(
  slug TEXT, "matchKey" TEXT, "scheduledAt" TIMESTAMPTZ, stage TEXT,
  "groupName" TEXT, "teamA" TEXT, "teamB" TEXT,
  "scoreA" SMALLINT, "scoreB" SMALLINT, "bestOf" SMALLINT,
  "resultType" TEXT, "labelA" TEXT, "labelB" TEXT, "decisionNote" TEXT,
  "bracketRound" SMALLINT, "bracketSide" TEXT, "bracketSlot" SMALLINT,
  "winnerToKey" TEXT, "winnerToSlot" CHAR(1),
  "loserToKey" TEXT, "loserToSlot" CHAR(1),
  "eliminatedTeam" TEXT, "sortOrder" SMALLINT, "isFinal" BOOLEAN
);

INSERT INTO tournament_matches (
  tournament_id, group_id, scheduled_at, stage,
  team_a_application_id, team_b_application_id,
  team_a_score, team_b_score, best_of, status, sort_order,
  result_type, team_a_result_label, team_b_result_label, decision_note,
  bracket_round, bracket_side, bracket_slot,
  eliminated_team_application_id
)
SELECT
  tournament.id, tournament_group.id, source."scheduledAt", source.stage,
  team_a.id, team_b.id, source."scoreA", source."scoreB", source."bestOf",
  'finished', source."sortOrder", source."resultType", source."labelA",
  source."labelB", source."decisionNote", source."bracketRound",
  source."bracketSide", source."bracketSlot", eliminated_team.id
FROM imported_fastcup_matches source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_team_applications team_a
  ON team_a.tournament_id = tournament.id AND team_a.team_name = source."teamA"
JOIN tournament_team_applications team_b
  ON team_b.tournament_id = tournament.id AND team_b.team_name = source."teamB"
LEFT JOIN tournament_groups tournament_group
  ON tournament_group.tournament_id = tournament.id
 AND tournament_group.name = source."groupName"
LEFT JOIN tournament_team_applications eliminated_team
  ON eliminated_team.tournament_id = tournament.id
 AND eliminated_team.team_name = source."eliminatedTeam"
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_matches existing
  WHERE existing.tournament_id = tournament.id
    AND existing.sort_order = source."sortOrder"
);

UPDATE tournament_matches source_match
SET winner_to_match_id = winner_match.id,
    winner_to_slot = source."winnerToSlot",
    loser_to_match_id = loser_match.id,
    loser_to_slot = source."loserToSlot"
FROM imported_fastcup_matches source
JOIN tournaments tournament ON tournament.slug = source.slug
LEFT JOIN imported_fastcup_matches winner_source
  ON winner_source.slug = source.slug AND winner_source."matchKey" = source."winnerToKey"
LEFT JOIN tournament_matches winner_match
  ON winner_match.tournament_id = tournament.id
 AND winner_match.sort_order = winner_source."sortOrder"
LEFT JOIN imported_fastcup_matches loser_source
  ON loser_source.slug = source.slug AND loser_source."matchKey" = source."loserToKey"
LEFT JOIN tournament_matches loser_match
  ON loser_match.tournament_id = tournament.id
 AND loser_match.sort_order = loser_source."sortOrder"
WHERE source_match.tournament_id = tournament.id
  AND source_match.sort_order = source."sortOrder";

CREATE TEMP TABLE imported_fastcup_rules ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset(${json(data.rules, "rules")}) AS source(
  slug TEXT, "sortOrder" SMALLINT, "ruleText" TEXT
);

INSERT INTO tournament_rules (tournament_id, sort_order, rule_text)
SELECT tournament.id, source."sortOrder", source."ruleText"
FROM imported_fastcup_rules source
JOIN tournaments tournament ON tournament.slug = source.slug
ON CONFLICT (tournament_id, sort_order) DO NOTHING;

INSERT INTO tournament_team_results (application_id, placement, result_label)
SELECT application.id, source.placement, source."resultLabel"
FROM imported_fastcup_teams source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_team_applications application
  ON application.tournament_id = tournament.id
 AND application.team_name = source."teamName"
ON CONFLICT (application_id) DO NOTHING;

INSERT INTO tournament_prizes (
  tournament_id, placement, application_id, team_name_snapshot, prize_text
)
SELECT tournament.id, source.placement, application.id,
  source."teamName", source."prizeText"
FROM imported_fastcup_teams source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_team_applications application
  ON application.tournament_id = tournament.id
 AND application.team_name = source."teamName"
WHERE source.placement IS NOT NULL
ON CONFLICT (tournament_id, placement) DO NOTHING;

CREATE TEMP TABLE imported_fastcup_schedule ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset(${json(data.schedules, "schedule")}) AS source(
  slug TEXT, "dayDate" DATE, "dayTitle" TEXT, "dayOrder" SMALLINT,
  "startTime" TIME, "stageName" TEXT, "matchCount" SMALLINT,
  "seriesFormat" TEXT, "entryOrder" SMALLINT
);

INSERT INTO tournament_schedule_days (tournament_id, day_date, title, sort_order)
SELECT DISTINCT tournament.id, source."dayDate", source."dayTitle", source."dayOrder"
FROM imported_fastcup_schedule source
JOIN tournaments tournament ON tournament.slug = source.slug
ON CONFLICT (tournament_id, sort_order) DO NOTHING;

INSERT INTO tournament_schedule_entries (
  day_id, start_time, stage_name, match_count, series_format, sort_order
)
SELECT schedule_day.id, source."startTime", source."stageName",
  source."matchCount", source."seriesFormat", source."entryOrder"
FROM imported_fastcup_schedule source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_schedule_days schedule_day
  ON schedule_day.tournament_id = tournament.id
 AND schedule_day.sort_order = source."dayOrder"
ON CONFLICT (day_id, sort_order) DO NOTHING;
`;

export async function writeFastcupArchiveImport({
  tournaments,
  sqlPath,
  reportPath,
}) {
  const data = flattenImportData(tournaments);
  const livePlayers = await fetchLivePlayers();
  fs.writeFileSync(sqlPath, buildSql(tournaments, data), "utf8");
  fs.writeFileSync(reportPath, buildFastcupReport(tournaments, livePlayers), "utf8");
  return { livePlayerCount: livePlayers.length, ...data };
}
