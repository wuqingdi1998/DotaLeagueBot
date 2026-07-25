DO $$
DECLARE
    tournament_id_value BIGINT;
    group_a_id BIGINT;
    group_b_id BIGINT;
BEGIN
    INSERT INTO tournaments (
        slug, name, eyebrow, headline, headline_accent, description, about,
        start_at, end_at, registration_deadline, status_label, format,
        team_size, max_teams, region, server, check_in_minutes,
        group_format, playoff_format, final_format, discord_url, status
    ) VALUES (
        'cd-fastcup-5',
        'CD Fastcup #5',
        'Архивный турнир',
        'CD Fastcup #5',
        '23–24 мая 2026',
        'Турнир для подписчиков Boosty: восемь команд, групповой этап и плей-офф.',
        'Captain''s Draft. Командный тир не выше 37, минимальный ранг игрока — Герой. Замены допускаются только по согласованию с организатором.',
        '2026-05-23 20:00:00+03',
        '2026-05-25 00:30:00+03',
        '2026-05-22 23:59:00+03',
        'Турнир завершён',
        'Captain''s Draft · 5 × 5',
        5,
        8,
        'EU / RU',
        'Stockholm',
        60,
        '2 группы · 3 тура · BO1',
        'Плей-офф · BO1',
        'Гранд-финал · BO3',
        'https://discord.gg/lsesports',
        'archived'
    )
    ON CONFLICT (slug) DO NOTHING;

    SELECT id INTO tournament_id_value
    FROM tournaments
    WHERE slug = 'cd-fastcup-5';

    IF EXISTS (
        SELECT 1
        FROM tournament_team_applications
        WHERE tournament_id = tournament_id_value
    ) THEN
        RETURN;
    END IF;

    INSERT INTO tournament_team_applications (
        tournament_id, team_name, tag, captain_discord_id, contact, logo_key,
        status, selection_method, captain_name_snapshot, team_tier_total_snapshot,
        created_at
    ) VALUES
        (tournament_id_value, 'Five Man Smoke', 'FMS', NULL, 'Архив', '', 'approved', 'Регистрация', 'Son1c', 37, '2026-05-20 12:00:00+03'),
        (tournament_id_value, 'GazGoGoGolder', 'GGG', NULL, 'Архив', '', 'approved', 'Регистрация', '10gu', 36, '2026-05-20 12:01:00+03'),
        (tournament_id_value, 'VoZd00h', 'VOZ', NULL, 'Архив', '', 'approved', 'Регистрация', 'Helqnux', 36, '2026-05-20 12:02:00+03'),
        (tournament_id_value, 'поколение чудес', 'ПЧ', NULL, 'Архив', '', 'approved', 'Регистрация', '.flowerZ', 36, '2026-05-20 12:03:00+03'),
        (tournament_id_value, 'SSS kill', 'SSS', NULL, 'Архив', '', 'approved', 'Регистрация', 'Sanraizu', 37, '2026-05-20 12:04:00+03'),
        (tournament_id_value, 'greencats', 'GC', NULL, 'Архив', '', 'approved', 'Регистрация', 'makeme', 37, '2026-05-20 12:05:00+03'),
        (tournament_id_value, 'Real Madrid', 'RM', NULL, 'Архив', '', 'approved', 'Приглашение', 'humblegod', 37, '2026-05-20 12:06:00+03'),
        (tournament_id_value, 'The Bazdrings', 'TB', NULL, 'Архив', '', 'approved', 'Приглашение', 'AlaStoR', 36, '2026-05-20 12:07:00+03');

    WITH roster(team_name, nickname, role, is_captain, sort_order) AS (
        VALUES
        ('Five Man Smoke', 'ГАНДОПЛЯС', 'safe_lane', FALSE, 1),
        ('Five Man Smoke', 'Son1c', 'mid_lane', TRUE, 2),
        ('Five Man Smoke', 'Wuqing', 'off_lane', FALSE, 3),
        ('Five Man Smoke', 'GOLDEN PAPI', 'soft_support', FALSE, 4),
        ('Five Man Smoke', 'ДЕД_ЕСЕНИН', 'hard_support', FALSE, 5),
        ('GazGoGoGolder', 'dravzen', 'safe_lane', FALSE, 1),
        ('GazGoGoGolder', 'lavchik', 'mid_lane', FALSE, 2),
        ('GazGoGoGolder', '10gu', 'off_lane', TRUE, 3),
        ('GazGoGoGolder', 'Zol', 'soft_support', FALSE, 4),
        ('GazGoGoGolder', 'cy119', 'hard_support', FALSE, 5),
        ('VoZd00h', 'fxreveryoungg', 'safe_lane', FALSE, 1),
        ('VoZd00h', 'evo', 'mid_lane', FALSE, 2),
        ('VoZd00h', 'Helqnux', 'off_lane', TRUE, 3),
        ('VoZd00h', 'N4ZE', 'soft_support', FALSE, 4),
        ('VoZd00h', 'vhskraaq', 'hard_support', FALSE, 5),
        ('поколение чудес', 'Drksp1ce', 'safe_lane', FALSE, 1),
        ('поколение чудес', '.flowerZ', 'mid_lane', TRUE, 2),
        ('поколение чудес', 'Ame''s Bastard', 'off_lane', FALSE, 3),
        ('поколение чудес', 'Pancake', 'soft_support', FALSE, 4),
        ('поколение чудес', 'umbrella', 'hard_support', FALSE, 5),
        ('SSS kill', 'confuse', 'safe_lane', FALSE, 1),
        ('SSS kill', 'Shima~', 'mid_lane', FALSE, 2),
        ('SSS kill', 'Sanraizu', 'off_lane', TRUE, 3),
        ('SSS kill', 'Gavr', 'soft_support', FALSE, 4),
        ('SSS kill', 'cYc.Lon3', 'hard_support', FALSE, 5),
        ('greencats', 'makeme', 'safe_lane', TRUE, 1),
        ('greencats', '1eqi', 'mid_lane', FALSE, 2),
        ('greencats', 'sqickyes', 'off_lane', FALSE, 3),
        ('greencats', 'greencat', 'soft_support', FALSE, 4),
        ('greencats', 'Shu', 'hard_support', FALSE, 5),
        ('Real Madrid', 'humblegod', 'safe_lane', TRUE, 1),
        ('Real Madrid', 'reality', 'mid_lane', FALSE, 2),
        ('Real Madrid', 'iloveiran', 'off_lane', FALSE, 3),
        ('Real Madrid', 'Sakana', 'soft_support', FALSE, 4),
        ('Real Madrid', 'dAViHci', 'hard_support', FALSE, 5),
        ('The Bazdrings', 'kispree', 'safe_lane', FALSE, 1),
        ('The Bazdrings', 'Pablo Escobar', 'mid_lane', FALSE, 2),
        ('The Bazdrings', 'Dale Cooper', 'off_lane', FALSE, 3),
        ('The Bazdrings', 'AlaStoR', 'soft_support', TRUE, 4),
        ('The Bazdrings', 'Glamdring', 'hard_support', FALSE, 5)
    )
    INSERT INTO tournament_roster_snapshots (
        application_id, player_id, nickname_snapshot, role,
        tier_snapshot, is_captain, sort_order
    )
    SELECT
        application.id,
        matched_player.discord_id,
        roster.nickname,
        roster.role,
        NULL,
        roster.is_captain,
        roster.sort_order
    FROM roster
    JOIN tournament_team_applications application
      ON application.tournament_id = tournament_id_value
     AND application.team_name = roster.team_name
    LEFT JOIN LATERAL (
        SELECT player.discord_id
        FROM players player
        WHERE LOWER(BTRIM(player.ingame_name)) = LOWER(BTRIM(roster.nickname))
        ORDER BY player.discord_id
        LIMIT 1
    ) matched_player ON TRUE;

    INSERT INTO tournament_groups (tournament_id, name, sort_order)
    VALUES
        (tournament_id_value, 'Группа A', 1),
        (tournament_id_value, 'Группа B', 2);

    SELECT id INTO group_a_id FROM tournament_groups
    WHERE tournament_id = tournament_id_value AND name = 'Группа A';
    SELECT id INTO group_b_id FROM tournament_groups
    WHERE tournament_id = tournament_id_value AND name = 'Группа B';

    INSERT INTO tournament_group_teams (group_id, application_id, sort_order)
    SELECT group_a_id, id,
        CASE team_name
            WHEN 'VoZd00h' THEN 1 WHEN 'Real Madrid' THEN 2
            WHEN 'Five Man Smoke' THEN 3 ELSE 4
        END
    FROM tournament_team_applications
    WHERE tournament_id = tournament_id_value
      AND team_name IN ('VoZd00h', 'Real Madrid', 'Five Man Smoke', 'SSS kill');

    INSERT INTO tournament_group_teams (group_id, application_id, sort_order)
    SELECT group_b_id, id,
        CASE team_name
            WHEN 'greencats' THEN 1 WHEN 'GazGoGoGolder' THEN 2
            WHEN 'поколение чудес' THEN 3 ELSE 4
        END
    FROM tournament_team_applications
    WHERE tournament_id = tournament_id_value
      AND team_name IN ('greencats', 'GazGoGoGolder', 'поколение чудес', 'The Bazdrings');

    WITH match_data(
        scheduled_at, stage, team_a, team_b, score_a, score_b, best_of,
        sort_order, group_name, result_type, label_a, label_b, decision_note,
        bracket_round, bracket_side, bracket_slot
    ) AS (
        VALUES
        ('2026-05-23 20:00:00+03'::timestamptz, 'Групповой этап · Тур 1', 'Five Man Smoke', 'VoZd00h', 0, 1, 1, 1, 'Группа A', 'normal', NULL, NULL, NULL, 1, 'group', 1),
        ('2026-05-23 20:00:00+03'::timestamptz, 'Групповой этап · Тур 1', 'SSS kill', 'Real Madrid', 0, 1, 1, 2, 'Группа A', 'normal', NULL, NULL, NULL, 1, 'group', 2),
        ('2026-05-23 20:00:00+03'::timestamptz, 'Групповой этап · Тур 1', 'GazGoGoGolder', 'поколение чудес', 1, 0, 1, 3, 'Группа B', 'normal', NULL, NULL, NULL, 1, 'group', 3),
        ('2026-05-23 20:00:00+03'::timestamptz, 'Групповой этап · Тур 1', 'greencats', 'The Bazdrings', 0, 1, 1, 4, 'Группа B', 'normal', NULL, NULL, NULL, 1, 'group', 4),
        ('2026-05-23 21:15:00+03'::timestamptz, 'Групповой этап · Тур 2', 'Five Man Smoke', 'SSS kill', 1, 0, 1, 5, 'Группа A', 'normal', NULL, NULL, NULL, 2, 'group', 1),
        ('2026-05-23 21:15:00+03'::timestamptz, 'Групповой этап · Тур 2', 'VoZd00h', 'Real Madrid', 0, 1, 1, 6, 'Группа A', 'normal', NULL, NULL, NULL, 2, 'group', 2),
        ('2026-05-23 21:15:00+03'::timestamptz, 'Групповой этап · Тур 2', 'GazGoGoGolder', 'greencats', 0, 1, 1, 7, 'Группа B', 'normal', NULL, NULL, NULL, 2, 'group', 3),
        ('2026-05-23 21:15:00+03'::timestamptz, 'Групповой этап · Тур 2', 'поколение чудес', 'The Bazdrings', 1, 0, 1, 8, 'Группа B', 'normal', NULL, NULL, NULL, 2, 'group', 4),
        ('2026-05-23 22:30:00+03'::timestamptz, 'Групповой этап · Тур 3', 'Five Man Smoke', 'Real Madrid', 1, 0, 1, 9, 'Группа A', 'normal', NULL, NULL, NULL, 3, 'group', 1),
        ('2026-05-23 22:30:00+03'::timestamptz, 'Групповой этап · Тур 3', 'VoZd00h', 'SSS kill', 1, 0, 1, 10, 'Группа A', 'normal', NULL, NULL, NULL, 3, 'group', 2),
        ('2026-05-23 22:30:00+03'::timestamptz, 'Групповой этап · Тур 3', 'GazGoGoGolder', 'The Bazdrings', 1, 0, 1, 11, 'Группа B', 'normal', NULL, NULL, NULL, 3, 'group', 3),
        ('2026-05-23 22:30:00+03'::timestamptz, 'Групповой этап · Тур 3', 'поколение чудес', 'greencats', 0, 1, 1, 12, 'Группа B', 'normal', NULL, NULL, NULL, 3, 'group', 4),
        ('2026-05-23 23:45:00+03'::timestamptz, 'Плей-офф · Раунд 1', 'VoZd00h', 'greencats', 1, 0, 1, 13, NULL, 'normal', NULL, NULL, NULL, 1, 'upper', 1),
        ('2026-05-23 23:45:00+03'::timestamptz, 'Плей-офф · Раунд 1', 'Real Madrid', 'GazGoGoGolder', 0, 1, 1, 14, NULL, 'normal', NULL, NULL, NULL, 1, 'lower', 1),
        ('2026-05-24 20:00:00+03'::timestamptz, 'Плей-офф · Матч за выход в финал', 'greencats', 'GazGoGoGolder', NULL, NULL, 1, 15, NULL, 'technical', 'tl', 'tw', 'greencats сняты с турнира из-за нарушения правил и недобросовестности игрока при указании его игрового рейтинга.', 2, 'lower', 1),
        ('2026-05-24 21:15:00+03'::timestamptz, 'Гранд-финал', 'VoZd00h', 'GazGoGoGolder', 2, 0, 3, 16, NULL, 'normal', NULL, NULL, NULL, 3, 'grand_final', 1)
    )
    INSERT INTO tournament_matches (
        tournament_id, group_id, scheduled_at, stage,
        team_a_application_id, team_b_application_id,
        team_a_score, team_b_score, best_of, status, sort_order,
        result_type, team_a_result_label, team_b_result_label, decision_note,
        bracket_round, bracket_side, bracket_slot
    )
    SELECT
        tournament_id_value,
        CASE match_data.group_name
            WHEN 'Группа A' THEN group_a_id
            WHEN 'Группа B' THEN group_b_id
            ELSE NULL
        END,
        match_data.scheduled_at,
        match_data.stage,
        team_a_application.id,
        team_b_application.id,
        match_data.score_a,
        match_data.score_b,
        match_data.best_of,
        'finished',
        match_data.sort_order,
        match_data.result_type,
        match_data.label_a,
        match_data.label_b,
        match_data.decision_note,
        match_data.bracket_round,
        match_data.bracket_side,
        match_data.bracket_slot
    FROM match_data
    JOIN tournament_team_applications team_a_application
      ON team_a_application.tournament_id = tournament_id_value
     AND team_a_application.team_name = match_data.team_a
    JOIN tournament_team_applications team_b_application
      ON team_b_application.tournament_id = tournament_id_value
     AND team_b_application.team_name = match_data.team_b;

    INSERT INTO tournament_rules (tournament_id, sort_order, rule_text) VALUES
        (tournament_id_value, 1, 'Зарегистрировать состав на турнир можно через сообщение @frokeng в Discord. Нужно обозначить никнеймы игроков из "Тир игроков" и их номинальные роли.'),
        (tournament_id_value, 2, 'Турнир только для Boosty-подписчиков. У некоторых игроков с уровнями поддержки сервера 1 и 2 есть возможность давать "подписочные" слоты для игроков, не подписанных на Boosty, но не более 2 на команду.'),
        (tournament_id_value, 3, 'Любому игроку может быть отказано в участии в турнире без объяснения причин. Турнирные тиры игроков устанавливаются на усмотрение организатора и не подлежат обсуждению.'),
        (tournament_id_value, 4, 'При регистрации команды сумма тиров всех 5 игроков должна составлять не более 37.'),
        (tournament_id_value, 5, 'Команде разрешено сделать замену, но не более одной замены. Воспользоваться заменой можно на одной карте за турнир. Замену нужно согласовать с организатором.'),
        (tournament_id_value, 6, 'На турнире предусмотрено 6 слотов для команд, возможно расширение до 8 слотов.'),
        (tournament_id_value, 7, 'Матч проводится на сервере Стокгольм и недоступен в разделе "Просмотр", турнирного билета нет. Через друзей можно смотреть матч с задержкой 2 минуты.'),
        (tournament_id_value, 8, 'Правила выбора стороны и очередности пика аналогичны другим серверным турнирам.'),
        (tournament_id_value, 9, 'Дата и время старта матчей указаны на листе "турнир". Опоздание команды более чем на 30 минут на игру приведет к её дисквалификации. Опоздание до 5 минут без штрафа. Опоздание от 6 до 15 минут - дополнительный бан через чат до завершения бан-стадии для оппонента. Опоздание от 16 до 25 минут - оппонент предлагает вам 3 героя на первый выбор, вы должны взять одного из них. Опоздание более чем на 25 минут - техническое поражение на первой карте и штраф бонусного времени 3-го уровня и выбор стороны или очереди пика на достаются оппоненту на оставшихся картах. Присутствие команды - это 5 игроков в слотах игроковго лобби и войс-канале одновременно.'),
        (tournament_id_value, 10, 'При равенстве результата у команд, их места в турнирной таблице (групповой этап) определяются по следующим показателям (применяются поочерёдно): личная встреча (в случае 2 команд), тай-брейк в OW 3.0 (3 команды)'),
        (tournament_id_value, 11, 'Пауза на карту - не более 15 минут на команду в бо1 матчах и не более 25 на команду в серии в бо3 матчах.'),
        (tournament_id_value, 12, 'Для участия в матче игроки устанавливают в Steam и в "изменить проф. информацию и команды" в настройках в клиенте игры свой серверный ник, если его нет - нужно пройти регистрацию на сервере.'),
        (tournament_id_value, 13, 'В каждой команде может присутствовать не более 2 "легионеров". "Легионер" - игрок, не сыгравший ни одной игры на серверных ивентах 8-го сезона. Исключения - @Sakana, @Mapes, @Ramp, @Игрок'),
        (tournament_id_value, 14, 'Каждая команда обязана создать себе команду в клиенте игры.'),
        (tournament_id_value, 15, 'Одобренные зарегистрированные команды появятся в разделе Составы.'),
        (tournament_id_value, 16, 'Правила могут дополняться как до, так и в ходе турнира.');

    INSERT INTO tournament_prizes (
        tournament_id, placement, application_id, team_name_snapshot, prize_text
    )
    SELECT tournament_id_value, prize.placement, application.id, prize.team_name, prize.prize_text
    FROM (
        VALUES
            (1::smallint, 'VoZd00h', '4 000 ₽'),
            (2::smallint, 'GazGoGoGolder', NULL),
            (3::smallint, 'Real Madrid', NULL)
    ) AS prize(placement, team_name, prize_text)
    JOIN tournament_team_applications application
      ON application.tournament_id = tournament_id_value
     AND application.team_name = prize.team_name;

    INSERT INTO tournament_team_results (
        application_id, placement, result_label
    )
    SELECT
        application.id,
        result.placement,
        result.result_label
    FROM (
        VALUES
            ('VoZd00h', 1::smallint, 'Победитель'),
            ('GazGoGoGolder', 2::smallint, 'Финалист'),
            ('Real Madrid', 3::smallint, '3-е место'),
            ('greencats', NULL::smallint, 'Сняты с турнира'),
            ('Five Man Smoke', NULL::smallint, 'Групповой этап'),
            ('SSS kill', NULL::smallint, 'Групповой этап'),
            ('поколение чудес', NULL::smallint, 'Групповой этап'),
            ('The Bazdrings', NULL::smallint, 'Групповой этап')
    ) AS result(team_name, placement, result_label)
    JOIN tournament_team_applications application
      ON application.tournament_id = tournament_id_value
     AND application.team_name = result.team_name
    ON CONFLICT (application_id) DO NOTHING;
END $$;
