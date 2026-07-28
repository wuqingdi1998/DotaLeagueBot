ALTER TABLE season_participants
    ADD COLUMN nickname_snapshot VARCHAR(100);

ALTER TABLE season_match_participants
    ADD COLUMN nickname_snapshot VARCHAR(100);

DO $migration$
DECLARE
    tournament_id_value BIGINT;
    missing_players TEXT;
    duplicate_profiles TEXT;
BEGIN
    CREATE TEMP TABLE season8_player_source ON COMMIT DROP AS
    SELECT *
    FROM jsonb_to_recordset($players$
    [
      {"nickname":"cYc.Lon3","section":"active"},{"nickname":"Shima~","section":"active"},
      {"nickname":"dravzen","section":"active"},{"nickname":"ДЕД_ЕСЕНИН","section":"active"},
      {"nickname":"Ame's bastard","section":"active"},{"nickname":"Gavr","section":"active"},
      {"nickname":"greencat","section":"active"},{"nickname":"Fayde","section":"active"},
      {"nickname":"Pancake","section":"active"},{"nickname":"lavchik","section":"active"},
      {"nickname":"frokeng","section":"active"},{"nickname":".flowerZ","section":"active"},
      {"nickname":"ls~","section":"active"},{"nickname":"Linkovatel","section":"active"},
      {"nickname":"Zol","section":"active"},{"nickname":"zobaa","section":"active"},
      {"nickname":"Drksp1ce","section":"active"},{"nickname":"umbrella","section":"active"},
      {"nickname":"Son1c","section":"active"},{"nickname":"nayк_cмepmu_228","section":"active"},
      {"nickname":"Wuqing","section":"active"},{"nickname":".Purvs","section":"active"},
      {"nickname":"iloveiran","section":"active"},{"nickname":"MirrorShard","section":"active"},
      {"nickname":"Glamdring","section":"active"},{"nickname":"N4ZE","section":"active"},
      {"nickname":"GOLDEN PAPI","section":"active"},{"nickname":"Makeme","section":"active"},
      {"nickname":"Helqnux","section":"active"},{"nickname":"evo","section":"active"},
      {"nickname":"sobriety","section":"active"},{"nickname":"Leeroy","section":"active"},
      {"nickname":"chep","section":"active"},{"nickname":"Felix_Anthony","section":"active"},
      {"nickname":"hvru","section":"active"},{"nickname":"10gu","section":"active"},
      {"nickname":"cy119","section":"active"},{"nickname":"SKYRIS","section":"active"},
      {"nickname":"Katakan","section":"active"},{"nickname":"MMR NE ZHALKO","section":"active"},
      {"nickname":"confuse","section":"active"},{"nickname":"Dale Cooper","section":"active"},
      {"nickname":"Yasama","section":"active"},{"nickname":"Kesanka","section":"active"},
      {"nickname":"lAf","section":"active"},{"nickname":"leo_sokolov","section":"active"},
      {"nickname":"reality","section":"active"},
      {"nickname":"fxreveryoungg","section":"inactive"},
      {"nickname":"hohlokit","section":"inactive"},
      {"nickname":"cherepashka","section":"inactive"},
      {"nickname":"Gary","section":"inactive"},{"nickname":"Inmortal","section":"inactive"},
      {"nickname":"Yozhik","section":"inactive"},{"nickname":"Bot Fergus","section":"inactive"},
      {"nickname":"Ar4ud1ksss","section":"inactive"},{"nickname":"eosom","section":"inactive"},
      {"nickname":"lotain","section":"inactive"},{"nickname":"vhskraaq","section":"inactive"},
      {"nickname":"AlaStoR","section":"inactive"},{"nickname":"escap1st","section":"inactive"},
      {"nickname":"LEGSDAY","section":"inactive"},{"nickname":"shu","section":"inactive"},
      {"nickname":"Yontlone","section":"inactive"},{"nickname":"InWalker","section":"inactive"},
      {
        "nickname":"gogogo",
        "section":"inactive",
        "reason":"Есть в составе 1-го тура, но отсутствует в итоговой таблице Excel"
      }
    ]
    $players$::jsonb) AS source(
        nickname TEXT,
        section TEXT,
        reason TEXT
    );

    CREATE TEMP TABLE season8_player_map ON COMMIT DROP AS
    WITH candidates AS (
        SELECT source.nickname, player.discord_id, 1 AS priority
        FROM season8_player_source source
        JOIN players player
          ON LOWER(BTRIM(player.ingame_name)) =
             LOWER(BTRIM(source.nickname))
        UNION ALL
        SELECT source.nickname, snapshot.player_id, 2 AS priority
        FROM season8_player_source source
        JOIN tournament_roster_snapshots snapshot
          ON LOWER(BTRIM(snapshot.nickname_snapshot)) =
             LOWER(BTRIM(source.nickname))
        WHERE snapshot.player_id IS NOT NULL
    )
    SELECT DISTINCT ON (nickname)
        nickname,
        discord_id
    FROM candidates
    ORDER BY nickname, priority, discord_id;

    SELECT STRING_AGG(source.nickname, ', ' ORDER BY source.nickname)
    INTO missing_players
    FROM season8_player_source source
    LEFT JOIN season8_player_map player_map
      ON player_map.nickname = source.nickname
    WHERE player_map.discord_id IS NULL;

    IF missing_players IS NOT NULL THEN
        RAISE NOTICE
            'Не найдены профили игроков сезона 8: %',
            missing_players;
    END IF;

    SELECT STRING_AGG(collision.nicknames, '; ' ORDER BY collision.nicknames)
    INTO duplicate_profiles
    FROM (
        SELECT STRING_AGG(
            player_map.nickname, ', ' ORDER BY player_map.nickname
        ) AS nicknames
        FROM season8_player_map player_map
        GROUP BY player_map.discord_id
        HAVING COUNT(*) > 1
    ) collision;

    IF duplicate_profiles IS NOT NULL THEN
        RAISE NOTICE
            'Один профиль связан с несколькими игроками сезона 8: %',
            duplicate_profiles;
    END IF;

    INSERT INTO tournaments (
        slug, name, eyebrow, headline, headline_accent, description, about,
        start_at, end_at, registration_deadline, status_label, format,
        team_size, max_teams, region, server, check_in_minutes,
        group_format, playoff_format, final_format, discord_url, status,
        tournament_type, season_round_count
    ) VALUES (
        'league-season-8',
        'Linken''s Sphere eSports 5x5 League Season 8',
        'Архивный сезонный турнир',
        'Linken''s Sphere eSports 5x5 League',
        'Season 8',
        'Четырнадцать туров индивидуальной лиги и два финальных матча.',
        'Участники каждый тур распределялись по временным составам. Победа '
            || 'приносила 2 очка, ничья — 1, поражение — 0. При равенстве '
            || 'очков учитывались процент побед на картах и число игр.',
        '2026-02-06 20:00:00+03',
        '2026-05-18 00:00:00+03',
        '2026-02-05 23:59:00+03',
        'Турнир завершён',
        'Сезонная лига · 5 × 5 · BO2',
        5,
        6,
        'EU / RU',
        'EU West',
        60,
        '14 туров · верхнее, среднее и нижнее лобби',
        '',
        '2 финала · 10 золотых и 10 серебряных медалей',
        'https://discord.gg/lsesports',
        'archived',
        'seasonal',
        14
    )
    ON CONFLICT (slug) DO NOTHING;

    SELECT id
    INTO tournament_id_value
    FROM tournaments
    WHERE slug = 'league-season-8';

    IF EXISTS (
        SELECT 1
        FROM season_lobbies lobby
        JOIN season_rounds round ON round.id = lobby.round_id
        WHERE round.tournament_id = tournament_id_value
    ) THEN
        RETURN;
    END IF;

    INSERT INTO season_rounds (
        tournament_id, round_number, name, status,
        scheduled_at, is_visible, round_kind
    )
    SELECT
        tournament_id_value,
        round_data.round_number,
        'Тур ' || round_data.round_number,
        'completed',
        round_data.scheduled_at,
        TRUE,
        'regular'
    FROM (
        VALUES
            (1, '2026-02-06 20:00:00+03'::timestamptz),
            (2, '2026-02-15 20:00:00+03'::timestamptz),
            (3, '2026-02-20 20:00:00+03'::timestamptz),
            (4, '2026-03-01 20:00:00+03'::timestamptz),
            (5, '2026-03-06 20:00:00+03'::timestamptz),
            (6, '2026-03-15 20:00:00+03'::timestamptz),
            (7, '2026-03-20 20:00:00+03'::timestamptz),
            (8, '2026-04-03 20:00:00+03'::timestamptz),
            (9, '2026-04-12 20:00:00+03'::timestamptz),
            (10, '2026-04-17 20:00:00+03'::timestamptz),
            (11, '2026-04-26 20:00:00+03'::timestamptz),
            (12, '2026-05-01 20:00:00+03'::timestamptz),
            (13, '2026-05-08 20:00:00+03'::timestamptz),
            (14, '2026-05-10 20:00:00+03'::timestamptz)
    ) AS round_data(round_number, scheduled_at)
    ON CONFLICT (tournament_id, round_number) DO NOTHING;

    INSERT INTO season_rounds (
        tournament_id, round_number, name, status,
        scheduled_at, is_visible, round_kind
    ) VALUES (
        tournament_id_value, 15, 'Финалы', 'planned',
        '2026-05-17 20:00:00+03', TRUE, 'finals'
    )
    ON CONFLICT (tournament_id, round_number) DO NOTHING;

    INSERT INTO season_participants (
        tournament_id, player_id, nickname_snapshot,
        standings_section, inactive_reason
    )
    SELECT
        tournament_id_value,
        player_map.discord_id,
        source.nickname,
        source.section,
        CASE
            WHEN source.section = 'inactive'
            THEN COALESCE(
                source.reason,
                'Инактив, покинул сервер или получил бан'
            )
            ELSE NULL
        END
    FROM season8_player_source source
    JOIN season8_player_map player_map
      ON player_map.nickname = source.nickname
    ON CONFLICT (tournament_id, player_id) DO UPDATE
    SET nickname_snapshot = EXCLUDED.nickname_snapshot,
        standings_section = EXCLUDED.standings_section,
        inactive_reason = EXCLUDED.inactive_reason;

    CREATE TEMP TABLE season8_match_source ON COMMIT DROP AS
    SELECT
        (entry.data->>'r')::int AS round_number,
        entry.data->>'l' AS lobby_name,
        entry.data->>'a' AS team_a_name,
        entry.data->>'b' AS team_b_name,
        (entry.data->>'sa')::int AS team_a_score,
        (entry.data->>'sb')::int AS team_b_score,
        entry.data->'ap' AS team_a_players,
        entry.data->'bp' AS team_b_players,
        ROW_NUMBER() OVER (
            PARTITION BY (entry.data->>'r')::int
            ORDER BY entry.source_order
        )::int AS lobby_order
    FROM jsonb_array_elements($matches$
    [
      {"r":1,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":0,"sb":2,"ap":["Fayde","gogogo","Yontlone","Wuqing","Yozhik"],"bp":["Ame's bastard","Gary","lavchik","greencat","Zol"]},
      {"r":1,"l":"Среднее лобби","a":"The Alliance","b":"Team Secret","sa":1,"sb":1,"ap":[".flowerZ","Gavr","ls~","GOLDEN PAPI","N4ZE"],"bp":["Yasama","Shima~","hohlokit","zobaa","cy119"]},
      {"r":1,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":2,"sb":0,"ap":["fxreveryoungg","evo","SKYRIS","Pancake","cYc.Lon3"],"bp":["eosom","10gu","escap1st","shu","frokeng"]},
      {"r":2,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":0,"sb":2,"ap":["Fayde","greencat","Wuqing","Yasama","vhskraaq"],"bp":["Ame's Bastard","cherepashka","iloveiran",".flowerZ","zobaa"]},
      {"r":2,"l":"Среднее лобби","a":"The Alliance","b":"Team Secret","sa":0,"sb":2,"ap":["lavchik","Gavr","evo","AlaStoR","cy119"],"bp":["Shima~","fxreveryoungg","hohlokit","Linkovatel","ДЕД_ЕСЕНИН"]},
      {"r":2,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":0,"sb":2,"ap":["10gu","Inmortal","GOLDEN PAPI","lotain","frokeng"],"bp":["ls~","Yozhik","dravzen","cYc.Lon3","Pancake"]},
      {"r":3,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":0,"sb":2,"ap":["Fayde","Gary","Ame's bastard","Shima~","zobaa"],"bp":["Son1c","greencat","cherepashka","Zol","fxreveryoungg"]},
      {"r":3,"l":"Среднее лобби","a":"The Alliance","b":"Team Secret","sa":1,"sb":1,"ap":["lavchik","Inmortal","ls~","lotain","ДЕД_ЕСЕНИН"],"bp":["Wuqing","10gu","evo","MirrorShard","cYc.Lon3"]},
      {"r":3,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":1,"sb":1,"ap":["Leeroy",".flowerZ","dravzen","Pancake","cy119"],"bp":["Gavr","Ar4ud1ksss","hvru","N4ZE","frokeng"]},
      {"r":4,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":2,"sb":0,"ap":["Son1c","Fayde","greencat","Zol","Gavr"],"bp":["Ame's bastard","Wuqing","Gary","iloveiran","lavchik"]},
      {"r":4,"l":"Среднее лобби","a":"The Alliance","b":"Team Secret","sa":2,"sb":0,"ap":["fxreveryoungg","Shima~","chep","hohlokit","cYc.Lon3"],"bp":["Leeroy",".flowerZ","Yasama","zobaa","Pancake"]},
      {"r":4,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":0,"sb":2,"ap":["Katakan","ls~","nayк_cмepmu_228","cy119","MirrorShard"],"bp":["Inmortal","10gu","dravzen","ДЕД_ЕСЕНИН","frokeng"]},
      {"r":5,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":2,"sb":0,"ap":["iloveiran","Ame's bastard",".flowerZ","zobaa","Katakan"],"bp":["greencat","fxreveryoungg","lavchik","Gavr","vhskraaq"]},
      {"r":5,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":1,"sb":1,"ap":["Shima~","sobriety","dravzen","MirrorShard","cYc.Lon3"],"bp":["evo","ls~","nayк_cмepmu_228","Pancake","frokeng"]},
      {"r":6,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":1,"sb":1,"ap":["Ame's bastard","Bot Fergus","Wuqing","zobaa","ДЕД_ЕСЕНИН"],"bp":["greencat","chep","lavchik","Zol","N4ZE"]},
      {"r":6,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":2,"sb":0,"ap":["Gavr",".flowerZ","nayк_cмepmu_228","MirrorShard","cYc.Lon3"],"bp":["Shima~","evo","Linkovatel","cy119","frokeng"]},
      {"r":7,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":2,"sb":0,"ap":["Ame's bastard","lavchik","Wuqing","zobaa","Gavr"],"bp":["Son1c","greencat","chep","Zol","cYc.Lon3"]},
      {"r":7,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":0,"sb":2,"ap":["Yasama",".flowerZ","MirrorShard","cy119","frokeng"],"bp":["Shima~","hvru","Pancake","ДЕД_ЕСЕНИН","nayк_cмepmu_228"]},
      {"r":8,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":2,"sb":0,"ap":["Fayde","greencat","Shima~","Helqnux","ДЕД_ЕСЕНИН"],"bp":["Ame's bastard","lavchik","Yasama","Katakan","GOLDEN PAPI"]},
      {"r":8,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":2,"sb":0,"ap":["Drksp1ce","eosom","MirrorShard","cYc.Lon3","dravzen"],"bp":[".flowerZ","10gu","Pancake","nayк_cмepmu_228","frokeng"]},
      {"r":9,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":2,"sb":0,"ap":["Fayde","lavchik","Zol","Leeroy",".Purvs"],"bp":["reality","greencat","Gavr","Shima~","ДЕД_ЕСЕНИН"]},
      {"r":9,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":0,"sb":2,"ap":["SKYRIS","nayк_cмepmu_228","cYc.Lon3","Pancake","lAf"],"bp":["Drksp1ce","dravzen","MirrorShard","umbrella","frokeng"]},
      {"r":10,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":0,"sb":2,"ap":["Fayde","Wuqing","Zol","Drksp1ce","MirrorShard"],"bp":["Ame's bastard","greencat","lavchik","Gavr","ДЕД_ЕСЕНИН"]},
      {"r":10,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":2,"sb":0,"ap":["Shima~","GOLDEN PAPI",".Purvs","nayк_cмepmu_228","cYc.Lon3"],"bp":["eosom","Helqnux","Pancake","umbrella","frokeng"]},
      {"r":11,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":1,"sb":1,"ap":["Ame's bastard","lavchik","Wuqing","MMR NE ZHALKO","GOLDEN PAPI"],"bp":["Fayde","Shima~","Gavr","greencat",".Purvs"]},
      {"r":11,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":1,"sb":1,"ap":["Drksp1ce","Felix_Anthony","Linkovatel","cYc.Lon3","frokeng"],"bp":["Makeme","dravzen","ДЕД_ЕСЕНИН","Pancake","umbrella"]},
      {"r":12,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":0,"sb":2,"ap":["Ame's bastard","Kesanka","greencat","lavchik","Gavr"],"bp":["Fayde","Son1c","iloveiran","Wuqing","Glamdring"]},
      {"r":12,"l":"Среднее лобби","a":"The Alliance","b":"Team Secret","sa":1,"sb":1,"ap":["Leeroy","Shima~","MMR NE ZHALKO","GOLDEN PAPI","cYc.Lon3"],"bp":["Drksp1ce",".flowerZ","Dale Cooper","Felix_Anthony",".Purvs"]},
      {"r":12,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":0,"sb":2,"ap":["10gu","Pancake","ДЕД_ЕСЕНИН","cy119","leo_sokolov"],"bp":["ls~","Linkovatel","dravzen","umbrella","frokeng"]},
      {"r":13,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":2,"sb":0,"ap":["Ame's bastard","Fayde","Gavr","Glamdring","Linkovatel"],"bp":["Son1c","lavchik",".flowerZ","greencat","ДЕД_ЕСЕНИН"]},
      {"r":13,"l":"Среднее лобби","a":"The Alliance","b":"Team Secret","sa":2,"sb":0,"ap":["Makeme","ls~","sobriety","Helqnux","N4ZE"],"bp":["iloveiran","MMR NE ZHALKO","hvru","GOLDEN PAPI","cy119"]},
      {"r":13,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":1,"sb":1,"ap":["Wuqing","confuse","dravzen","umbrella","frokeng"],"bp":["Drksp1ce","Shima~","Felix_Anthony","Pancake","cYc.Lon3"]},
      {"r":14,"l":"Верхнее лобби","a":"Natus Vincere","b":"Team Empire","sa":1,"sb":1,"ap":["Fayde","Son1c","Glamdring","Linkovatel","cYc.Lon3"],"bp":["Ame's bastard","greencat","Gavr","Shima~","umbrella"]},
      {"r":14,"l":"Нижнее лобби","a":"Evil Geniuses","b":"NewBee","sa":1,"sb":1,"ap":[".flowerZ","Drksp1ce","ДЕД_ЕСЕНИН","cy119","frokeng"],"bp":["Makeme","Helqnux","dravzen","MirrorShard","Pancake"]}
    ]
    $matches$::jsonb) WITH ORDINALITY AS entry(data, source_order);

    INSERT INTO season_lobbies (
        round_id, name, sort_order, status, scheduled_at
    )
    SELECT
        round.id,
        match_source.lobby_name,
        match_source.lobby_order,
        'completed',
        round.scheduled_at
    FROM season8_match_source match_source
    JOIN season_rounds round
      ON round.tournament_id = tournament_id_value
     AND round.round_number = match_source.round_number
    ON CONFLICT (round_id, sort_order) DO NOTHING;

    INSERT INTO season_matches (
        lobby_id, scheduled_at, team_a_name, team_b_name, best_of,
        team_a_score, team_b_score, result, status, sort_order
    )
    SELECT
        lobby.id,
        round.scheduled_at,
        match_source.team_a_name,
        match_source.team_b_name,
        2,
        match_source.team_a_score,
        match_source.team_b_score,
        CASE
            WHEN match_source.team_a_score > match_source.team_b_score
            THEN 'team_a'
            WHEN match_source.team_b_score > match_source.team_a_score
            THEN 'team_b'
            ELSE 'draw'
        END,
        'completed',
        1
    FROM season8_match_source match_source
    JOIN season_rounds round
      ON round.tournament_id = tournament_id_value
     AND round.round_number = match_source.round_number
    JOIN season_lobbies lobby
      ON lobby.round_id = round.id
     AND lobby.name = match_source.lobby_name
    ON CONFLICT (lobby_id, sort_order) DO NOTHING;

    INSERT INTO season_match_participants (
        match_id, player_id, nickname_snapshot, team_side, is_captain
    )
    SELECT
        match.id,
        player_map.discord_id,
        participant.player_name,
        participant.team_side,
        FALSE
    FROM season8_match_source match_source
    JOIN season_rounds round
      ON round.tournament_id = tournament_id_value
     AND round.round_number = match_source.round_number
    JOIN season_lobbies lobby
      ON lobby.round_id = round.id
     AND lobby.name = match_source.lobby_name
    JOIN season_matches match
      ON match.lobby_id = lobby.id
     AND match.sort_order = 1
    CROSS JOIN LATERAL (
        SELECT player_name, 'a'::char(1) AS team_side
        FROM jsonb_array_elements_text(
            match_source.team_a_players
        ) AS team_a(player_name)
        UNION ALL
        SELECT player_name, 'b'::char(1) AS team_side
        FROM jsonb_array_elements_text(
            match_source.team_b_players
        ) AS team_b(player_name)
    ) participant
    JOIN season8_player_map player_map
      ON LOWER(BTRIM(player_map.nickname)) =
         LOWER(BTRIM(participant.player_name))
    ON CONFLICT (match_id, player_id) DO NOTHING;

    INSERT INTO season_penalty_events (
        tournament_id, player_id, round_id, fire_count, note
    )
    SELECT
        tournament_id_value,
        player_map.discord_id,
        round.id,
        penalty.fire_count,
        'Перенесено из итоговой таблицы сезона 8'
    FROM jsonb_to_recordset($penalties$
    [
      {"nickname":"eosom","fire_count":8,"round_number":10},
      {"nickname":"Ame's bastard","fire_count":7,"round_number":8},
      {"nickname":"MirrorShard","fire_count":8,"round_number":12},
      {"nickname":"Helqnux","fire_count":6,"round_number":10},
      {"nickname":"InWalker","fire_count":6,"round_number":1},
      {"nickname":"Yasama","fire_count":6,"round_number":4},
      {"nickname":"Inmortal","fire_count":5,"round_number":6},
      {"nickname":"Leeroy","fire_count":5,"round_number":1},
      {"nickname":"Zol","fire_count":5,"round_number":10},
      {"nickname":"Wuqing","fire_count":5,"round_number":13},
      {"nickname":"cherepashka","fire_count":4,"round_number":14},
      {"nickname":"cYc.Lon3","fire_count":4,"round_number":14},
      {"nickname":"Fayde","fire_count":4,"round_number":14},
      {"nickname":"iloveiran","fire_count":4,"round_number":14},
      {"nickname":"Pancake","fire_count":4,"round_number":14},
      {"nickname":"Shima~","fire_count":4,"round_number":14},
      {"nickname":"fxreveryoungg","fire_count":3,"round_number":14},
      {"nickname":"hvru","fire_count":3,"round_number":14},
      {"nickname":"Katakan","fire_count":3,"round_number":14},
      {"nickname":"lavchik","fire_count":3,"round_number":14},
      {"nickname":"cy119","fire_count":2,"round_number":14},
      {"nickname":"frokeng","fire_count":2,"round_number":14},
      {"nickname":"nayк_cмepmu_228","fire_count":2,"round_number":14},
      {"nickname":"zobaa","fire_count":2,"round_number":14},
      {"nickname":".flowerZ","fire_count":1,"round_number":14},
      {"nickname":"10gu","fire_count":1,"round_number":14},
      {"nickname":"ДЕД_ЕСЕНИН","fire_count":1,"round_number":14},
      {"nickname":"Ar4ud1ksss","fire_count":1,"round_number":14},
      {"nickname":"Gavr","fire_count":1,"round_number":14},
      {"nickname":"ls~","fire_count":1,"round_number":14},
      {"nickname":"sobriety","fire_count":1,"round_number":14},
      {"nickname":"Son1c","fire_count":1,"round_number":14}
    ]
    $penalties$::jsonb) AS penalty(
        nickname TEXT,
        fire_count INT,
        round_number INT
    )
    JOIN season8_player_map player_map
      ON LOWER(BTRIM(player_map.nickname)) =
         LOWER(BTRIM(penalty.nickname))
    JOIN season_rounds round
      ON round.tournament_id = tournament_id_value
     AND round.round_number = penalty.round_number
    ON CONFLICT (tournament_id, player_id, round_id) DO UPDATE
    SET fire_count = EXCLUDED.fire_count,
        note = EXCLUDED.note,
        updated_at = NOW();

    CREATE TEMP TABLE season8_final_match_source ON COMMIT DROP AS
    SELECT
        entry.data->>'l' AS lobby_name,
        entry.data->>'a' AS team_a_name,
        entry.data->>'b' AS team_b_name,
        entry.data->'ap' AS team_a_players,
        entry.data->'bp' AS team_b_players,
        entry.source_order::int AS lobby_order
    FROM jsonb_array_elements($final_matches$
    [
      {
        "l":"Верхнее лобби",
        "a":"Natus Vincere",
        "b":"Team Empire",
        "ap":["Ame's bastard","lavchik","Gavr","greencat","zobaa"],
        "bp":["Fayde","Son1c","Wuqing","Zol","ДЕД_ЕСЕНИН"]
      },
      {
        "l":"Нижнее лобби",
        "a":"Evil Geniuses",
        "b":"NewBee",
        "ap":["Shima~","Linkovatel","dravzen","cYc.Lon3","umbrella"],
        "bp":[".flowerZ","Drksp1ce","MirrorShard","Pancake","frokeng"]
      }
    ]
    $final_matches$::jsonb) WITH ORDINALITY AS entry(data, source_order);

    INSERT INTO season_lobbies (
        round_id, name, sort_order, status, scheduled_at
    )
    SELECT
        round.id,
        final_match.lobby_name,
        final_match.lobby_order,
        'scheduled',
        round.scheduled_at
    FROM season8_final_match_source final_match
    JOIN season_rounds round
      ON round.tournament_id = tournament_id_value
     AND round.round_kind = 'finals'
    ON CONFLICT (round_id, sort_order) DO NOTHING;

    INSERT INTO season_matches (
        lobby_id, scheduled_at, team_a_name, team_b_name,
        best_of, status, sort_order
    )
    SELECT
        lobby.id,
        round.scheduled_at,
        final_match.team_a_name,
        final_match.team_b_name,
        2,
        'published',
        1
    FROM season8_final_match_source final_match
    JOIN season_rounds round
      ON round.tournament_id = tournament_id_value
     AND round.round_kind = 'finals'
    JOIN season_lobbies lobby
      ON lobby.round_id = round.id
     AND lobby.name = final_match.lobby_name
    ON CONFLICT (lobby_id, sort_order) DO NOTHING;

    INSERT INTO season_match_participants (
        match_id, player_id, nickname_snapshot, team_side, is_captain
    )
    SELECT
        match.id,
        player_map.discord_id,
        participant.player_name,
        participant.team_side,
        FALSE
    FROM season8_final_match_source final_match
    JOIN season_rounds round
      ON round.tournament_id = tournament_id_value
     AND round.round_kind = 'finals'
    JOIN season_lobbies lobby
      ON lobby.round_id = round.id
     AND lobby.name = final_match.lobby_name
    JOIN season_matches match
      ON match.lobby_id = lobby.id
     AND match.sort_order = 1
    CROSS JOIN LATERAL (
        SELECT player_name, 'a'::char(1) AS team_side
        FROM jsonb_array_elements_text(
            final_match.team_a_players
        ) AS team_a(player_name)
        UNION ALL
        SELECT player_name, 'b'::char(1) AS team_side
        FROM jsonb_array_elements_text(
            final_match.team_b_players
        ) AS team_b(player_name)
    ) participant
    JOIN season8_player_map player_map
      ON LOWER(BTRIM(player_map.nickname)) =
         LOWER(BTRIM(participant.player_name))
    ON CONFLICT (match_id, player_id) DO NOTHING;

    INSERT INTO season_finalists (
        tournament_id, player_id, seed, medal, note
    )
    SELECT
        tournament_id_value,
        player_map.discord_id,
        finalist.seed,
        NULL,
        'Финалист сезона 8'
    FROM jsonb_to_recordset($finalists$
    [
      {"nickname":"Ame's bastard","seed":1},{"nickname":"greencat","seed":2},
      {"nickname":"Fayde","seed":3},{"nickname":"Son1c","seed":4},
      {"nickname":"lavchik","seed":5},{"nickname":"Zol","seed":6},
      {"nickname":"Wuqing","seed":7},{"nickname":"Shima~","seed":8},
      {"nickname":"Gavr","seed":9},{"nickname":".flowerZ","seed":10},
      {"nickname":"Drksp1ce","seed":11},{"nickname":"Linkovatel","seed":12},
      {"nickname":"zobaa","seed":13},{"nickname":"dravzen","seed":14},
      {"nickname":"ДЕД_ЕСЕНИН","seed":15},
      {"nickname":"MirrorShard","seed":16},{"nickname":"cYc.Lon3","seed":17},
      {"nickname":"Pancake","seed":18},{"nickname":"umbrella","seed":19},
      {"nickname":"frokeng","seed":20}
    ]
    $finalists$::jsonb) AS finalist(nickname TEXT, seed INT)
    JOIN season8_player_map player_map
      ON LOWER(BTRIM(player_map.nickname)) =
         LOWER(BTRIM(finalist.nickname))
    ON CONFLICT (tournament_id, player_id) DO UPDATE
    SET seed = EXCLUDED.seed,
        medal = NULL,
        note = EXCLUDED.note,
        updated_at = NOW();
END
$migration$;
