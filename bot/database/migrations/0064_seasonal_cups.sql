ALTER TABLE tournaments
    DROP CONSTRAINT IF EXISTS tournaments_tournament_type_check;
ALTER TABLE tournaments
    ADD CONSTRAINT tournaments_tournament_type_check
    CHECK (tournament_type IN ('ordinary', 'seasonal', 'seasonal_cup'));

ALTER TABLE tournaments
    DROP CONSTRAINT IF EXISTS tournaments_season_round_count_by_type_check;
ALTER TABLE tournaments
    ADD CONSTRAINT tournaments_season_round_count_by_type_check
    CHECK (
        (tournament_type IN ('ordinary', 'seasonal_cup') AND season_round_count = 0)
        OR (tournament_type = 'seasonal' AND season_round_count BETWEEN 1 AND 100)
    );

ALTER TABLE tournament_team_applications
    ALTER COLUMN team_name TYPE VARCHAR(80);

ALTER TABLE tournament_roster_snapshots
    DROP CONSTRAINT IF EXISTS tournament_roster_snapshots_role_check;
ALTER TABLE tournament_roster_snapshots
    ADD CONSTRAINT tournament_roster_snapshots_role_check
    CHECK (role IN (
        'safe_lane', 'mid_lane', 'off_lane', 'soft_support', 'hard_support', 'coach'
    ));

CREATE TEMP TABLE seasonal_cup_tournaments (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    description TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO seasonal_cup_tournaments VALUES
    ('league-cup-season-5', 'LS League Cup Season 5', '2024-10-21 00:00:00+03', '2024-11-17 23:59:00+03', 'Сезонный кубок №5: групповой этап и плей-офф.'),
    ('league-cup-season-6', 'LS League Cup Season 6', '2025-03-17 00:00:00+03', '2025-04-20 23:59:00+03', 'Сезонный кубок №6: групповой этап и плей-офф.'),
    ('league-cup-season-7', 'LS League Cup Season 7', '2025-10-27 00:00:00+03', '2025-12-08 23:59:00+03', 'Сезонный кубок №7: групповой этап, тай-брейк и плей-офф.'),
    ('league-cup-season-8', 'LS League Cup Season 8', '2026-03-30 00:00:00+03', '2026-05-03 23:59:00+03', 'Сезонный кубок №8: групповой этап и плей-офф.');

INSERT INTO tournaments (
    slug, name, eyebrow, headline, headline_accent, description, about,
    start_at, end_at, registration_deadline, status_label, format,
    team_size, max_teams, region, server, check_in_minutes,
    group_format, playoff_format, final_format, discord_url, status,
    playoff_type, tournament_type, season_round_count
)
SELECT
    source.slug, source.name, 'Архивный сезонный кубок', source.name,
    TO_CHAR(source.start_at AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY') || ' — ' ||
      TO_CHAR(source.end_at AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY'),
    source.description,
    'Архивная запись сезонного кубка Linken''s Sphere. Сохранены составы, групповой этап и плей-офф.',
    source.start_at, source.end_at, source.start_at - INTERVAL '1 day',
    'Турнир завершён', 'Captain''s Mode · 5 × 5', 5, 4, '', 'Stockholm', 60,
    'Общая группа · BO2', 'Double Elimination · BO3', 'Гранд-финал · BO3',
    'https://discord.gg/lsesports', 'archived', 'double_elimination', 'seasonal_cup', 0
FROM seasonal_cup_tournaments source
ON CONFLICT (slug) DO NOTHING;

CREATE TEMP TABLE seasonal_cup_teams (
    slug TEXT NOT NULL,
    team_name TEXT NOT NULL,
    tag TEXT NOT NULL,
    seed SMALLINT NOT NULL,
    placement SMALLINT NOT NULL,
    prize_text TEXT,
    PRIMARY KEY (slug, team_name)
) ON COMMIT DROP;

INSERT INTO seasonal_cup_teams VALUES
    ('league-cup-season-5', 'hardlane diff', 'HLD', 1, 4, NULL),
    ('league-cup-season-5', 'Стас', 'STAS', 2, 1, '9 900 ₽'),
    ('league-cup-season-5', 'пятеро в потоке?!', '5VP', 3, 3, NULL),
    ('league-cup-season-5', 'what evo', 'EVO', 4, 2, NULL),
    ('league-cup-season-6', 'Иван', 'IVAN', 1, 3, NULL),
    ('league-cup-season-6', 'Team Invisibility', 'INVS', 2, 1, '9 900 ₽'),
    ('league-cup-season-6', 'десант (хомячковый)', 'DES', 3, 2, NULL),
    ('league-cup-season-6', 'бумберс прайм', 'BMP', 4, 4, NULL),
    ('league-cup-season-7', 'Стас 2', 'ST2', 1, 3, NULL),
    ('league-cup-season-7', 'Село AfK-Boteevo', 'AFK', 2, 4, NULL),
    ('league-cup-season-7', 'Мишень для пуль', 'MDP', 3, 1, '12 500 ₽'),
    ('league-cup-season-7', 'IGavr Team', 'IGT', 4, 2, '2 500 ₽'),
    ('league-cup-season-8', 'Pepe Shneine', 'PEPE', 1, 2, 'Серебро Зала славы'),
    ('league-cup-season-8', 'NoSmurfs', 'NS', 2, 1, '10 800 ₽ · золото Зала славы'),
    ('league-cup-season-8', 'команда Гаврюшков', 'GAVR', 3, 3, 'Бронза Зала славы'),
    ('league-cup-season-8', 'казахгойда67', 'KG67', 4, 4, NULL);

INSERT INTO tournament_team_applications (
    tournament_id, team_name, tag, captain_discord_id, contact, logo_key,
    status, selection_method, captain_name_snapshot
)
SELECT tournament.id, source.team_name, source.tag, NULL, 'Архив', '',
       'approved', 'Приглашение', NULL
FROM seasonal_cup_teams source
JOIN tournaments tournament ON tournament.slug = source.slug
ON CONFLICT (tournament_id, team_name) DO NOTHING;

CREATE TEMP TABLE seasonal_cup_rosters (
    slug TEXT NOT NULL,
    team_name TEXT NOT NULL,
    nickname TEXT NOT NULL,
    role TEXT NOT NULL,
    is_captain BOOLEAN NOT NULL,
    sort_order SMALLINT NOT NULL
) ON COMMIT DROP;

INSERT INTO seasonal_cup_rosters VALUES
    ('league-cup-season-5', 'hardlane diff', 'Gavr', 'safe_lane', true, 1),
    ('league-cup-season-5', 'hardlane diff', '143', 'mid_lane', false, 2),
    ('league-cup-season-5', 'hardlane diff', 'illusion human', 'off_lane', false, 3),
    ('league-cup-season-5', 'hardlane diff', 'sobriety', 'soft_support', false, 4),
    ('league-cup-season-5', 'hardlane diff', 'Demyan', 'hard_support', false, 5),
    ('league-cup-season-5', 'hardlane diff', 'Bot Fergus', 'coach', false, 6),
    ('league-cup-season-5', 'Стас', 'swiplash', 'safe_lane', true, 1),
    ('league-cup-season-5', 'Стас', 'sheluvsme', 'mid_lane', false, 2),
    ('league-cup-season-5', 'Стас', 'Hades', 'off_lane', false, 3),
    ('league-cup-season-5', 'Стас', 'Bel1eve', 'soft_support', false, 4),
    ('league-cup-season-5', 'Стас', 'ПОДПИВАС', 'hard_support', false, 5),
    ('league-cup-season-5', 'Стас', 'Fayde', 'coach', false, 6),
    ('league-cup-season-5', 'пятеро в потоке?!', 'lastvvord', 'safe_lane', true, 1),
    ('league-cup-season-5', 'пятеро в потоке?!', 'Yoma', 'mid_lane', false, 2),
    ('league-cup-season-5', 'пятеро в потоке?!', 'frokeng', 'off_lane', false, 3),
    ('league-cup-season-5', 'пятеро в потоке?!', 'kuindzhi', 'soft_support', false, 4),
    ('league-cup-season-5', 'пятеро в потоке?!', 'wispiq', 'hard_support', false, 5),
    ('league-cup-season-5', 'пятеро в потоке?!', 'Raven', 'coach', false, 6),
    ('league-cup-season-5', 'what evo', 'lotain', 'safe_lane', true, 1),
    ('league-cup-season-5', 'what evo', 'evo', 'mid_lane', false, 2),
    ('league-cup-season-5', 'what evo', 'GOLDEN POPI', 'off_lane', false, 3),
    ('league-cup-season-5', 'what evo', 'Immersion', 'soft_support', false, 4),
    ('league-cup-season-5', 'what evo', 'Bigg_Daddy', 'hard_support', false, 5),
    ('league-cup-season-5', 'what evo', 'Gary', 'coach', false, 6),
    ('league-cup-season-6', 'Иван', 'swiplash', 'safe_lane', true, 1),
    ('league-cup-season-6', 'Иван', 'Kotic diff', 'mid_lane', false, 2),
    ('league-cup-season-6', 'Иван', 'Gavr', 'off_lane', false, 3),
    ('league-cup-season-6', 'Иван', 'Bel1eve', 'soft_support', false, 4),
    ('league-cup-season-6', 'Иван', 'ПОДПИВАС', 'hard_support', false, 5),
    ('league-cup-season-6', 'Иван', 'Wuqing', 'coach', false, 6),
    ('league-cup-season-6', 'Team Invisibility', 'iFlopz!', 'safe_lane', false, 1),
    ('league-cup-season-6', 'Team Invisibility', '10gu', 'mid_lane', false, 2),
    ('league-cup-season-6', 'Team Invisibility', 'Grega', 'off_lane', false, 3),
    ('league-cup-season-6', 'Team Invisibility', 'wispiq', 'soft_support', false, 4),
    ('league-cup-season-6', 'Team Invisibility', 'GOLDEN POPI', 'hard_support', true, 5),
    ('league-cup-season-6', 'Team Invisibility', 'Yontlone', 'coach', false, 6),
    ('league-cup-season-6', 'десант (хомячковый)', 'ls~', 'safe_lane', false, 1),
    ('league-cup-season-6', 'десант (хомячковый)', 'velhiore', 'mid_lane', false, 2),
    ('league-cup-season-6', 'десант (хомячковый)', 'chep', 'off_lane', false, 3),
    ('league-cup-season-6', 'десант (хомячковый)', 'sobriety', 'soft_support', false, 4),
    ('league-cup-season-6', 'десант (хомячковый)', 'Morana', 'hard_support', true, 5),
    ('league-cup-season-6', 'десант (хомячковый)', 'Bot Fergus', 'coach', false, 6),
    ('league-cup-season-6', 'бумберс прайм', 'lotain', 'safe_lane', false, 1),
    ('league-cup-season-6', 'бумберс прайм', 'cusdvaqe', 'mid_lane', false, 2),
    ('league-cup-season-6', 'бумберс прайм', 'frokeng', 'off_lane', true, 3),
    ('league-cup-season-6', 'бумберс прайм', 'sarasa~', 'soft_support', false, 4),
    ('league-cup-season-6', 'бумберс прайм', 'Linkovatel', 'hard_support', false, 5),
    ('league-cup-season-6', 'бумберс прайм', 'Son1c', 'coach', false, 6),
    ('league-cup-season-7', 'Стас 2', 'swiplash', 'safe_lane', true, 1),
    ('league-cup-season-7', 'Стас 2', '.fromoldnuke', 'mid_lane', false, 2),
    ('league-cup-season-7', 'Стас 2', 'GOLDEN POPI', 'off_lane', false, 3),
    ('league-cup-season-7', 'Стас 2', 'escapist', 'soft_support', false, 4),
    ('league-cup-season-7', 'Стас 2', 'vhskraaq', 'hard_support', false, 5),
    ('league-cup-season-7', 'Село AfK-Boteevo', 'eclipse', 'safe_lane', true, 1),
    ('league-cup-season-7', 'Село AfK-Boteevo', 'evo', 'mid_lane', false, 2),
    ('league-cup-season-7', 'Село AfK-Boteevo', 'Grega', 'off_lane', false, 3),
    ('league-cup-season-7', 'Село AfK-Boteevo', 'Pancake', 'soft_support', false, 4),
    ('league-cup-season-7', 'Село AfK-Boteevo', 'ДЕД_ЕСЕНИН', 'hard_support', false, 5),
    ('league-cup-season-7', 'Мишень для пуль', 'confuse', 'safe_lane', true, 1),
    ('league-cup-season-7', 'Мишень для пуль', '10gu', 'mid_lane', false, 2),
    ('league-cup-season-7', 'Мишень для пуль', 'frokeng', 'off_lane', false, 3),
    ('league-cup-season-7', 'Мишень для пуль', 'Zol', 'soft_support', false, 4),
    ('league-cup-season-7', 'Мишень для пуль', 'Linkovatel', 'hard_support', false, 5),
    ('league-cup-season-7', 'IGavr Team', 'SKYRIS', 'safe_lane', true, 1),
    ('league-cup-season-7', 'IGavr Team', 'ls~', 'mid_lane', false, 2),
    ('league-cup-season-7', 'IGavr Team', 'Gavr', 'off_lane', false, 3),
    ('league-cup-season-7', 'IGavr Team', 'cy119', 'soft_support', false, 4),
    ('league-cup-season-7', 'IGavr Team', 'Quest_NPC', 'hard_support', false, 5),
    ('league-cup-season-8', 'Pepe Shneine', 'dravzen', 'safe_lane', false, 1),
    ('league-cup-season-8', 'Pepe Shneine', '10gu', 'mid_lane', true, 2),
    ('league-cup-season-8', 'Pepe Shneine', 'Katakan', 'off_lane', false, 3),
    ('league-cup-season-8', 'Pepe Shneine', 'Pancake', 'soft_support', false, 4),
    ('league-cup-season-8', 'Pepe Shneine', 'MirrorShard', 'hard_support', false, 5),
    ('league-cup-season-8', 'Pepe Shneine', 'Zol', 'coach', false, 6),
    ('league-cup-season-8', 'NoSmurfs', 'fxreveryoungg', 'safe_lane', false, 1),
    ('league-cup-season-8', 'NoSmurfs', 'confuse', 'mid_lane', false, 2),
    ('league-cup-season-8', 'NoSmurfs', 'cYc.Lon3', 'off_lane', false, 3),
    ('league-cup-season-8', 'NoSmurfs', 'N4ZE', 'soft_support', false, 4),
    ('league-cup-season-8', 'NoSmurfs', 'cy119', 'hard_support', true, 5),
    ('league-cup-season-8', 'NoSmurfs', 'lavchik', 'coach', false, 6),
    ('league-cup-season-8', 'команда Гаврюшков', 'SKYRIS', 'safe_lane', false, 1),
    ('league-cup-season-8', 'команда Гаврюшков', 'Shima~', 'mid_lane', true, 2),
    ('league-cup-season-8', 'команда Гаврюшков', 'Gavr', 'off_lane', false, 3),
    ('league-cup-season-8', 'команда Гаврюшков', 'TeMan', 'soft_support', false, 4),
    ('league-cup-season-8', 'команда Гаврюшков', 'ДЕД_ЕСЕНИН', 'hard_support', false, 5),
    ('league-cup-season-8', 'команда Гаврюшков', 'Fayde', 'coach', false, 6),
    ('league-cup-season-8', 'казахгойда67', 'iFlopz!', 'safe_lane', false, 1),
    ('league-cup-season-8', 'казахгойда67', 'eosom', 'mid_lane', false, 2),
    ('league-cup-season-8', 'казахгойда67', 'frokeng', 'off_lane', true, 3),
    ('league-cup-season-8', 'казахгойда67', 'Bel1eve', 'soft_support', false, 4),
    ('league-cup-season-8', 'казахгойда67', 'GOLDEN POPI', 'hard_support', false, 5),
    ('league-cup-season-8', 'казахгойда67', 'Ame''s Bastard', 'coach', false, 6);

CREATE TEMP TABLE seasonal_cup_names AS
WITH distinct_names AS (
    SELECT DISTINCT nickname, LOWER(BTRIM(nickname)) AS nickname_key
    FROM seasonal_cup_rosters
)
SELECT nickname, nickname_key,
       (-8600000000000000 - ROW_NUMBER() OVER (ORDER BY nickname_key))::BIGINT AS archive_player_id,
       NULL::BIGINT AS resolved_player_id
FROM distinct_names;

WITH historical_aliases AS (
    SELECT LOWER(BTRIM(player.ingame_name)) AS nickname_key, member.identity_id
    FROM players player
    JOIN player_identity_members member ON member.player_id = player.discord_id
    UNION
    SELECT LOWER(BTRIM(member.nickname_snapshot)), member.identity_id
    FROM player_identity_members member
    UNION
    SELECT LOWER(BTRIM(participant.nickname_snapshot)), member.identity_id
    FROM season_participants participant
    JOIN player_identity_members member ON member.player_id = participant.player_id
    UNION
    SELECT LOWER(BTRIM(participant.nickname_snapshot)), member.identity_id
    FROM season_match_participants participant
    JOIN player_identity_members member ON member.player_id = participant.player_id
    UNION
    SELECT LOWER(BTRIM(snapshot.nickname_snapshot)), member.identity_id
    FROM tournament_roster_snapshots snapshot
    JOIN player_identity_members member ON member.player_id = snapshot.player_id
), unique_aliases AS (
    SELECT nickname_key, MIN(identity_id) AS identity_id
    FROM historical_aliases
    GROUP BY nickname_key
    HAVING COUNT(DISTINCT identity_id) = 1
), resolved AS (
    SELECT source.nickname_key,
           COALESCE(identity.registered_player_id, MIN(member.player_id)) AS player_id
    FROM seasonal_cup_names source
    JOIN unique_aliases alias ON alias.nickname_key = source.nickname_key
    JOIN player_identities identity ON identity.id = alias.identity_id
    JOIN player_identity_members member ON member.identity_id = identity.id
    GROUP BY source.nickname_key, identity.registered_player_id
)
UPDATE seasonal_cup_names source
SET resolved_player_id = resolved.player_id
FROM resolved
WHERE resolved.nickname_key = source.nickname_key;

INSERT INTO players (discord_id, steam_id32, ingame_name, real_name, is_archived, archived_at)
SELECT archive_player_id, nextval('archived_player_steam_id_seq'), nickname,
       'Архивная запись сезонного кубка', TRUE, NOW()
FROM seasonal_cup_names
WHERE resolved_player_id IS NULL
ON CONFLICT (discord_id) DO NOTHING;

CREATE TEMP TABLE seasonal_cup_player_map AS
SELECT nickname, COALESCE(resolved_player_id, archive_player_id) AS player_id
FROM seasonal_cup_names;

UPDATE tournament_team_applications application
SET captain_name_snapshot = captain.nickname
FROM tournaments tournament
JOIN seasonal_cup_rosters captain
  ON captain.slug = tournament.slug AND captain.is_captain
WHERE application.tournament_id = tournament.id
  AND application.team_name = captain.team_name;

INSERT INTO tournament_roster_snapshots (
    application_id, player_id, nickname_snapshot, role, tier_snapshot,
    is_captain, sort_order
)
SELECT application.id, player_map.player_id, roster.nickname, roster.role,
       NULL, roster.is_captain, roster.sort_order
FROM seasonal_cup_rosters roster
JOIN tournaments tournament ON tournament.slug = roster.slug
JOIN tournament_team_applications application
  ON application.tournament_id = tournament.id
 AND application.team_name = roster.team_name
JOIN seasonal_cup_player_map player_map ON player_map.nickname = roster.nickname
ON CONFLICT (application_id, role) DO NOTHING;

INSERT INTO tournament_groups (tournament_id, name, sort_order)
SELECT tournament.id, 'Общая группа', 1
FROM tournaments tournament
JOIN seasonal_cup_tournaments source ON source.slug = tournament.slug
ON CONFLICT (tournament_id, name) DO NOTHING;

INSERT INTO tournament_group_teams (group_id, application_id, sort_order)
SELECT tournament_group.id, application.id, source.seed
FROM seasonal_cup_teams source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_groups tournament_group
  ON tournament_group.tournament_id = tournament.id
 AND tournament_group.name = 'Общая группа'
JOIN tournament_team_applications application
  ON application.tournament_id = tournament.id
 AND application.team_name = source.team_name
ON CONFLICT (group_id, application_id) DO NOTHING;

CREATE TEMP TABLE seasonal_cup_matches (
    slug TEXT NOT NULL, match_key TEXT NOT NULL, scheduled_at TIMESTAMPTZ NOT NULL,
    stage TEXT NOT NULL, group_name TEXT, team_a TEXT NOT NULL, team_b TEXT NOT NULL,
    score_a SMALLINT NOT NULL, score_b SMALLINT NOT NULL, best_of SMALLINT NOT NULL,
    bracket_side TEXT NOT NULL, bracket_round SMALLINT NOT NULL, bracket_slot SMALLINT NOT NULL,
    winner_to_key TEXT, winner_to_slot TEXT, loser_to_key TEXT, loser_to_slot TEXT,
    eliminated_team TEXT, sort_order INTEGER NOT NULL,
    PRIMARY KEY (slug, match_key)
) ON COMMIT DROP;

INSERT INTO seasonal_cup_matches VALUES
    ('league-cup-season-5', 'g1', '2024-10-25 22:00:00+03', 'Групповой этап', 'Общая группа', 'what evo', 'пятеро в потоке?!', 2, 0, 2, 'group', 1, 1, NULL, NULL, NULL, NULL, NULL, 1),
    ('league-cup-season-5', 'g2', '2024-10-30 20:45:00+03', 'Групповой этап', 'Общая группа', 'Стас', 'what evo', 1, 1, 2, 'group', 1, 2, NULL, NULL, NULL, NULL, NULL, 2),
    ('league-cup-season-5', 'g3', '2024-11-03 19:30:00+03', 'Групповой этап', 'Общая группа', 'Стас', 'пятеро в потоке?!', 2, 0, 2, 'group', 1, 3, NULL, NULL, NULL, NULL, NULL, 3),
    ('league-cup-season-5', 'g4', '2024-11-04 21:00:00+03', 'Групповой этап', 'Общая группа', 'hardlane diff', 'what evo', 0, 2, 2, 'group', 1, 4, NULL, NULL, NULL, NULL, NULL, 4),
    ('league-cup-season-5', 'g5', '2024-11-05 22:00:00+03', 'Групповой этап', 'Общая группа', 'hardlane diff', 'Стас', 1, 1, 2, 'group', 1, 5, NULL, NULL, NULL, NULL, NULL, 5),
    ('league-cup-season-5', 'g6', '2024-11-06 22:00:00+03', 'Групповой этап', 'Общая группа', 'hardlane diff', 'пятеро в потоке?!', 1, 1, 2, 'group', 1, 6, NULL, NULL, NULL, NULL, NULL, 6),
    ('league-cup-season-5', 'wr', '2024-11-08 21:00:00+03', 'Плей-офф · Верхняя сетка', NULL, 'Стас', 'what evo', 2, 1, 3, 'upper', 1, 1, 'gf', 'a', 'lf', 'a', NULL, 7),
    ('league-cup-season-5', 'lr', '2024-11-09 22:30:00+03', 'Плей-офф · Нижняя сетка', NULL, 'hardlane diff', 'пятеро в потоке?!', 1, 2, 3, 'lower', 1, 1, 'lf', 'b', NULL, NULL, 'hardlane diff', 8),
    ('league-cup-season-5', 'lf', '2024-11-16 22:00:00+03', 'Плей-офф · Финал нижней сетки', NULL, 'what evo', 'пятеро в потоке?!', 2, 0, 3, 'lower', 2, 1, 'gf', 'b', NULL, NULL, 'пятеро в потоке?!', 9),
    ('league-cup-season-5', 'gf', '2024-11-17 21:00:00+03', 'Гранд-финал', NULL, 'Стас', 'what evo', 2, 1, 3, 'grand_final', 3, 1, NULL, NULL, NULL, NULL, 'what evo', 10),
    ('league-cup-season-6', 'g1', '2025-03-25 22:00:00+03', 'Групповой этап', 'Общая группа', 'Team Invisibility', 'бумберс прайм', 0, 2, 2, 'group', 1, 1, NULL, NULL, NULL, NULL, NULL, 1),
    ('league-cup-season-6', 'g2', '2025-03-27 21:45:00+03', 'Групповой этап', 'Общая группа', 'десант (хомячковый)', 'Иван', 0, 2, 2, 'group', 1, 2, NULL, NULL, NULL, NULL, NULL, 2),
    ('league-cup-season-6', 'g3', '2025-03-29 22:10:00+03', 'Групповой этап', 'Общая группа', 'бумберс прайм', 'Иван', 0, 2, 2, 'group', 1, 3, NULL, NULL, NULL, NULL, NULL, 3),
    ('league-cup-season-6', 'g4', '2025-04-01 21:00:00+03', 'Групповой этап', 'Общая группа', 'Team Invisibility', 'Иван', 1, 1, 2, 'group', 1, 4, NULL, NULL, NULL, NULL, NULL, 4),
    ('league-cup-season-6', 'g5', '2025-04-05 19:00:00+03', 'Групповой этап', 'Общая группа', 'Team Invisibility', 'десант (хомячковый)', 0, 2, 2, 'group', 1, 5, NULL, NULL, NULL, NULL, NULL, 5),
    ('league-cup-season-6', 'g6', '2025-04-05 22:00:00+03', 'Групповой этап', 'Общая группа', 'десант (хомячковый)', 'бумберс прайм', 2, 0, 2, 'group', 1, 6, NULL, NULL, NULL, NULL, NULL, 6),
    ('league-cup-season-6', 'wr', '2025-04-10 20:45:00+03', 'Плей-офф · Верхняя сетка', NULL, 'Иван', 'десант (хомячковый)', 0, 2, 3, 'upper', 1, 1, 'gf', 'a', 'lf', 'a', NULL, 7),
    ('league-cup-season-6', 'lr', '2025-04-12 22:00:00+03', 'Плей-офф · Нижняя сетка', NULL, 'бумберс прайм', 'Team Invisibility', 1, 2, 3, 'lower', 1, 1, 'lf', 'b', NULL, NULL, 'бумберс прайм', 8),
    ('league-cup-season-6', 'lf', '2025-04-15 20:30:00+03', 'Плей-офф · Финал нижней сетки', NULL, 'Иван', 'Team Invisibility', 0, 2, 3, 'lower', 2, 1, 'gf', 'b', NULL, NULL, 'Иван', 9),
    ('league-cup-season-6', 'gf', '2025-04-17 20:30:00+03', 'Гранд-финал', NULL, 'десант (хомячковый)', 'Team Invisibility', 1, 2, 3, 'grand_final', 3, 1, NULL, NULL, NULL, NULL, 'десант (хомячковый)', 10),
    ('league-cup-season-7', 'g1', '2025-11-06 22:40:00+03', 'Групповой этап', 'Общая группа', 'Мишень для пуль', 'IGavr Team', 1, 1, 2, 'group', 1, 1, NULL, NULL, NULL, NULL, NULL, 1),
    ('league-cup-season-7', 'g2', '2025-11-12 22:30:00+03', 'Групповой этап', 'Общая группа', 'Село AfK-Boteevo', 'Мишень для пуль', 0, 2, 2, 'group', 1, 2, NULL, NULL, NULL, NULL, NULL, 2),
    ('league-cup-season-7', 'g3', '2025-11-15 22:30:00+03', 'Групповой этап', 'Общая группа', 'Стас 2', 'IGavr Team', 1, 1, 2, 'group', 1, 3, NULL, NULL, NULL, NULL, NULL, 3),
    ('league-cup-season-7', 'g4', '2025-11-19 20:00:00+03', 'Групповой этап', 'Общая группа', 'Село AfK-Boteevo', 'IGavr Team', 1, 1, 2, 'group', 1, 4, NULL, NULL, NULL, NULL, NULL, 4),
    ('league-cup-season-7', 'g5', '2025-11-20 22:40:00+03', 'Групповой этап', 'Общая группа', 'Стас 2', 'Мишень для пуль', 1, 1, 2, 'group', 1, 5, NULL, NULL, NULL, NULL, NULL, 5),
    ('league-cup-season-7', 'g6', '2025-11-22 22:20:00+03', 'Групповой этап', 'Общая группа', 'Стас 2', 'Село AfK-Boteevo', 1, 1, 2, 'group', 1, 6, NULL, NULL, NULL, NULL, NULL, 6),
    ('league-cup-season-7', 'tb', '2025-11-24 21:00:00+03', 'Групповой этап · Тай-брейк', 'Общая группа', 'Стас 2', 'IGavr Team', 0, 1, 1, 'group', 2, 1, NULL, NULL, NULL, NULL, NULL, 7),
    ('league-cup-season-7', 'wr', '2025-11-26 21:40:00+03', 'Плей-офф · Верхняя сетка', NULL, 'Мишень для пуль', 'IGavr Team', 2, 0, 3, 'upper', 1, 1, 'gf', 'a', 'lf', 'a', NULL, 8),
    ('league-cup-season-7', 'lr', '2025-11-29 20:00:00+03', 'Плей-офф · Нижняя сетка', NULL, 'Стас 2', 'Село AfK-Boteevo', 2, 1, 3, 'lower', 1, 1, 'lf', 'b', NULL, NULL, 'Село AfK-Boteevo', 9),
    ('league-cup-season-7', 'lf', '2025-12-01 22:20:00+03', 'Плей-офф · Финал нижней сетки', NULL, 'IGavr Team', 'Стас 2', 2, 1, 3, 'lower', 2, 1, 'gf', 'b', NULL, NULL, 'Стас 2', 10),
    ('league-cup-season-7', 'gf', '2025-12-08 22:40:00+03', 'Гранд-финал', NULL, 'Мишень для пуль', 'IGavr Team', 2, 0, 3, 'grand_final', 3, 1, NULL, NULL, NULL, NULL, 'IGavr Team', 11),
    ('league-cup-season-8', 'g1', '2026-04-09 22:00:00+03', 'Групповой этап', 'Общая группа', 'команда Гаврюшков', 'казахгойда67', 0, 2, 2, 'group', 1, 1, NULL, NULL, NULL, NULL, NULL, 1),
    ('league-cup-season-8', 'g2', '2026-04-11 22:00:00+03', 'Групповой этап', 'Общая группа', 'Pepe Shneine', 'казахгойда67', 2, 0, 2, 'group', 1, 2, NULL, NULL, NULL, NULL, NULL, 2),
    ('league-cup-season-8', 'g3', '2026-04-13 22:00:00+03', 'Групповой этап', 'Общая группа', 'Pepe Shneine', 'команда Гаврюшков', 0, 2, 2, 'group', 1, 3, NULL, NULL, NULL, NULL, NULL, 3),
    ('league-cup-season-8', 'g4', '2026-04-14 20:00:00+03', 'Групповой этап', 'Общая группа', 'NoSmurfs', 'казахгойда67', 1, 1, 2, 'group', 1, 4, NULL, NULL, NULL, NULL, NULL, 4),
    ('league-cup-season-8', 'g5', '2026-04-14 22:45:00+03', 'Групповой этап', 'Общая группа', 'NoSmurfs', 'команда Гаврюшков', 0, 2, 2, 'group', 1, 5, NULL, NULL, NULL, NULL, NULL, 5),
    ('league-cup-season-8', 'g6', '2026-04-15 22:00:00+03', 'Групповой этап', 'Общая группа', 'Pepe Shneine', 'NoSmurfs', 1, 1, 2, 'group', 1, 6, NULL, NULL, NULL, NULL, NULL, 6),
    ('league-cup-season-8', 'lr', '2026-04-19 21:30:00+03', 'Плей-офф · Нижняя сетка', NULL, 'казахгойда67', 'NoSmurfs', 0, 2, 3, 'lower', 1, 1, 'lf', 'b', NULL, NULL, 'казахгойда67', 7),
    ('league-cup-season-8', 'wr', '2026-04-22 22:00:00+03', 'Плей-офф · Верхняя сетка', NULL, 'команда Гаврюшков', 'Pepe Shneine', 1, 2, 3, 'upper', 1, 1, 'gf', 'a', 'lf', 'a', NULL, 8),
    ('league-cup-season-8', 'lf', '2026-04-29 22:30:00+03', 'Плей-офф · Финал нижней сетки', NULL, 'команда Гаврюшков', 'NoSmurfs', 1, 2, 3, 'lower', 2, 1, 'gf', 'b', NULL, NULL, 'команда Гаврюшков', 9),
    ('league-cup-season-8', 'gf', '2026-05-03 21:00:00+03', 'Гранд-финал', NULL, 'Pepe Shneine', 'NoSmurfs', 0, 2, 3, 'grand_final', 3, 1, NULL, NULL, NULL, NULL, 'Pepe Shneine', 10);

INSERT INTO tournament_matches (
    tournament_id, group_id, scheduled_at, stage,
    team_a_application_id, team_b_application_id,
    team_a_score, team_b_score, best_of, status, sort_order,
    result_type, bracket_round, bracket_side, bracket_slot,
    bracket_grid_column, bracket_grid_row, eliminated_team_application_id
)
SELECT tournament.id, tournament_group.id, source.scheduled_at, source.stage,
       team_a.id, team_b.id, source.score_a, source.score_b, source.best_of,
       'finished', source.sort_order, 'normal', source.bracket_round,
       source.bracket_side, source.bracket_slot,
       CASE source.bracket_side WHEN 'upper' THEN 1 WHEN 'lower' THEN source.bracket_round
            WHEN 'grand_final' THEN 3 ELSE NULL END,
       CASE source.bracket_side WHEN 'upper' THEN 1 WHEN 'lower' THEN 3
            WHEN 'grand_final' THEN 2 ELSE NULL END,
       eliminated.id
FROM seasonal_cup_matches source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_team_applications team_a
  ON team_a.tournament_id = tournament.id AND team_a.team_name = source.team_a
JOIN tournament_team_applications team_b
  ON team_b.tournament_id = tournament.id AND team_b.team_name = source.team_b
LEFT JOIN tournament_groups tournament_group
  ON tournament_group.tournament_id = tournament.id
 AND tournament_group.name = source.group_name
LEFT JOIN tournament_team_applications eliminated
  ON eliminated.tournament_id = tournament.id
 AND eliminated.team_name = source.eliminated_team
WHERE NOT EXISTS (
    SELECT 1 FROM tournament_matches existing
    WHERE existing.tournament_id = tournament.id
      AND existing.sort_order = source.sort_order
);

UPDATE tournament_matches source_match
SET winner_to_match_id = winner_match.id,
    winner_to_slot = source.winner_to_slot,
    loser_to_match_id = loser_match.id,
    loser_to_slot = source.loser_to_slot
FROM seasonal_cup_matches source
JOIN tournaments tournament ON tournament.slug = source.slug
LEFT JOIN seasonal_cup_matches winner_source
  ON winner_source.slug = source.slug AND winner_source.match_key = source.winner_to_key
LEFT JOIN tournament_matches winner_match
  ON winner_match.tournament_id = tournament.id AND winner_match.sort_order = winner_source.sort_order
LEFT JOIN seasonal_cup_matches loser_source
  ON loser_source.slug = source.slug AND loser_source.match_key = source.loser_to_key
LEFT JOIN tournament_matches loser_match
  ON loser_match.tournament_id = tournament.id AND loser_match.sort_order = loser_source.sort_order
WHERE source_match.tournament_id = tournament.id
  AND source_match.sort_order = source.sort_order
  AND (source.winner_to_key IS NOT NULL OR source.loser_to_key IS NOT NULL);

WITH dated_matches AS (
    SELECT source.slug,
           (source.scheduled_at AT TIME ZONE 'Europe/Moscow')::DATE AS day_date,
           DENSE_RANK() OVER (
               PARTITION BY source.slug
               ORDER BY (source.scheduled_at AT TIME ZONE 'Europe/Moscow')::DATE
           )::INTEGER AS day_order
    FROM seasonal_cup_matches source
    GROUP BY source.slug, (source.scheduled_at AT TIME ZONE 'Europe/Moscow')::DATE
)
INSERT INTO tournament_schedule_days (tournament_id, day_date, title, sort_order)
SELECT tournament.id, source.day_date, 'Игровой день', source.day_order
FROM dated_matches source
JOIN tournaments tournament ON tournament.slug = source.slug
ON CONFLICT (tournament_id, sort_order) DO NOTHING;

WITH scheduled_matches AS (
    SELECT source.*,
           (source.scheduled_at AT TIME ZONE 'Europe/Moscow')::DATE AS day_date,
           (source.scheduled_at AT TIME ZONE 'Europe/Moscow')::TIME AS start_time,
           ROW_NUMBER() OVER (
               PARTITION BY source.slug,
                   (source.scheduled_at AT TIME ZONE 'Europe/Moscow')::DATE
               ORDER BY source.scheduled_at, source.sort_order
           )::INTEGER AS day_order
    FROM seasonal_cup_matches source
)
INSERT INTO tournament_schedule_entries (
    day_id, start_time, stage_name, match_count, series_format, sort_order
)
SELECT schedule_day.id, source.start_time, source.stage, 1,
       'BO' || source.best_of::TEXT, source.day_order
FROM scheduled_matches source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_schedule_days schedule_day
  ON schedule_day.tournament_id = tournament.id
 AND schedule_day.day_date = source.day_date
ON CONFLICT (day_id, sort_order) DO NOTHING;

INSERT INTO tournament_team_results (application_id, placement, result_label)
SELECT application.id, source.placement,
       CASE source.placement WHEN 1 THEN 'Победитель' WHEN 2 THEN 'Финалист'
            ELSE source.placement::TEXT || '-е место' END
FROM seasonal_cup_teams source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_team_applications application
  ON application.tournament_id = tournament.id AND application.team_name = source.team_name
ON CONFLICT (application_id) DO UPDATE
SET placement = EXCLUDED.placement, result_label = EXCLUDED.result_label, updated_at = NOW();

INSERT INTO tournament_prizes (
    tournament_id, placement, application_id, team_name_snapshot, prize_text
)
SELECT tournament.id, source.placement, application.id, source.team_name, source.prize_text
FROM seasonal_cup_teams source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_team_applications application
  ON application.tournament_id = tournament.id AND application.team_name = source.team_name
WHERE source.prize_text IS NOT NULL
ON CONFLICT (tournament_id, placement) DO NOTHING;

INSERT INTO tournament_rules (tournament_id, sort_order, rule_text)
SELECT tournament.id, rule.sort_order, rule.rule_text
FROM tournaments tournament
JOIN seasonal_cup_tournaments source ON source.slug = tournament.slug
CROSS JOIN (VALUES
    (1, 'Архивный сезонный кубок состоит из группового этапа и плей-офф.'),
    (2, 'Результаты и составы перенесены из оригинальной таблицы турнира.')
) AS rule(sort_order, rule_text)
ON CONFLICT (tournament_id, sort_order) DO NOTHING;

INSERT INTO player_medals (
    player_id, tournament_id, medal_type, title, description, awarded_at
)
SELECT roster.player_id, tournament.id,
       CASE team.placement WHEN 1 THEN 'gold'::text
            WHEN 2 THEN 'silver'::text ELSE 'bronze'::text END,
       'LS League Cup Season 8',
       team.placement::TEXT || '-е место в сезонном кубке', tournament.end_at
FROM tournaments tournament
JOIN tournament_team_applications application ON application.tournament_id = tournament.id
JOIN seasonal_cup_teams team
  ON team.slug = tournament.slug AND team.team_name = application.team_name
JOIN tournament_roster_snapshots roster ON roster.application_id = application.id
WHERE tournament.slug = 'league-cup-season-8'
  AND team.placement BETWEEN 1 AND 3
  AND roster.role <> 'coach'
  AND NOT EXISTS (
      SELECT 1 FROM player_medals existing
      WHERE existing.player_id = roster.player_id
        AND existing.tournament_id = tournament.id
        AND existing.medal_type = CASE team.placement
            WHEN 1 THEN 'gold'::text WHEN 2 THEN 'silver'::text ELSE 'bronze'::text END
  );
