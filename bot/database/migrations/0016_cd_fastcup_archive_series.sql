CREATE TEMP TABLE fastcup_tournaments (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    about TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    registration_deadline TIMESTAMPTZ NOT NULL,
    max_teams SMALLINT NOT NULL,
    group_format TEXT NOT NULL,
    playoff_format TEXT NOT NULL,
    final_format TEXT NOT NULL,
    playoff_type TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO fastcup_tournaments VALUES
    (
        'cd-fastcup-1',
        'CD Fastcup',
        'Первый турнир серии CD Fastcup: четыре команды, общая группа и гранд-финал.',
        'Captain''s Draft. Командный тир не выше 34, минимальный ранг игрока — Герой. Замены допускаются по согласованию с организатором.',
        '2025-02-21 21:30:00+03',
        '2025-02-22 23:59:00+03',
        '2025-02-20 23:59:00+03',
        4,
        '1 группа · 3 тура · BO1',
        'Плей-офф · 2 команды',
        'Гранд-финал · BO3',
        'single_elimination'
    ),
    (
        'cd-fastcup-2',
        'CD Fastcup #2',
        'Турнир для подписчиков Boosty: шесть команд, общая группа и плей-офф.',
        'Captain''s Draft. Командный тир не выше 35, минимальный ранг игрока — Герой. Замены допускаются по согласованию с организатором.',
        '2025-05-01 20:30:00+03',
        '2025-05-03 23:59:00+03',
        '2025-04-30 23:59:00+03',
        6,
        '1 группа · 3 тура · BO1',
        'Плей-офф · двойное выбывание · BO3/BO1',
        'Гранд-финал · BO3',
        'double_elimination'
    ),
    (
        'cd-fastcup-3',
        'CD Fastcup #3',
        'Четыре команды, общая группа с сериями BO2 и гранд-финал.',
        'Captain''s Draft. Командный тир не выше 35, минимальный ранг игрока — Герой.',
        '2025-07-11 21:00:00+03',
        '2025-07-13 23:59:00+03',
        '2025-07-10 23:59:00+03',
        4,
        '1 группа · 3 тура · BO2',
        'Плей-офф · 2 команды',
        'Гранд-финал · BO3',
        'single_elimination'
    ),
    (
        'cd-fastcup-4',
        'LS CD Fastcup #4',
        'Четыре команды, общая группа и плей-офф с выходом лидера напрямую в финал.',
        'Captain''s Draft. Командный тир не выше 37, минимальный ранг игрока — Герой.',
        '2025-10-25 20:30:00+03',
        '2025-10-26 23:59:00+03',
        '2025-10-24 23:59:00+03',
        4,
        '1 группа · 3 тура · BO1',
        'Плей-офф · одиночное выбывание · BO1',
        'Гранд-финал · BO3',
        'single_elimination'
    ),
    (
        'cd-fastcup-6',
        'CD Fastcup #6',
        'Турнир для подписчиков Boosty: шесть команд, общая группа и плей-офф.',
        'Captain''s Draft. Командный тир не выше 39, минимальный ранг игрока — Герой. Взнос команды — 500 ₽.',
        '2026-07-10 20:00:00+03',
        '2026-07-12 23:59:00+03',
        '2026-07-09 23:59:00+03',
        6,
        '1 группа · 3 тура · BO1',
        'Плей-офф · двойное выбывание · BO1/BO3',
        'Гранд-финал · BO3',
        'double_elimination'
    );

INSERT INTO tournaments (
    slug, name, eyebrow, headline, headline_accent, description, about,
    start_at, end_at, registration_deadline, status_label, format,
    team_size, max_teams, region, server, check_in_minutes,
    group_format, playoff_format, final_format, discord_url, status,
    playoff_type
)
SELECT
    source.slug,
    source.name,
    'Архивный турнир',
    source.name,
    TO_CHAR(source.start_at AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY')
        || ' — '
        || TO_CHAR(source.end_at AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY'),
    source.description,
    source.about,
    source.start_at,
    source.end_at,
    source.registration_deadline,
    'Турнир завершён',
    'Captain''s Draft · 5 × 5',
    5,
    source.max_teams,
    '',
    'Stockholm',
    60,
    source.group_format,
    source.playoff_format,
    source.final_format,
    'https://discord.gg/lsesports',
    'archived',
    source.playoff_type
FROM fastcup_tournaments source
ON CONFLICT (slug) DO NOTHING;

CREATE TEMP TABLE fastcup_teams (
    slug TEXT NOT NULL,
    seed SMALLINT NOT NULL,
    team_name TEXT NOT NULL,
    tag TEXT NOT NULL,
    captain_name TEXT,
    tier_total SMALLINT,
    placement SMALLINT,
    result_label TEXT NOT NULL,
    prize_text TEXT,
    PRIMARY KEY (slug, team_name)
) ON COMMIT DROP;

INSERT INTO fastcup_teams VALUES
    ('cd-fastcup-1', 1, 'We''re going to live', 'WGTL', '143', 33, 4, '3–4-е место', NULL),
    ('cd-fastcup-1', 2, 'Бананчики', 'BAN', 'ls~', 34, 1, 'Победитель', 'Boosty-подписки «Руны» на выбор на всю команду'),
    ('cd-fastcup-1', 3, 'DJoKEZS', 'DJK', 'lotain', 34, 2, 'Финалист', NULL),
    ('cd-fastcup-1', 4, 'квакун', 'KVK', 'Bel1eve', 34, 3, '3–4-е место', NULL),

    ('cd-fastcup-2', 1, 'Team Amplify', 'AMP', NULL, 35, 2, 'Финалист', NULL),
    ('cd-fastcup-2', 2, 'Asakura', 'ASA', NULL, 35, 5, 'Групповой этап', NULL),
    ('cd-fastcup-2', 3, 'Туалетные бойцы', 'TB', NULL, 35, 4, '4-е место', NULL),
    ('cd-fastcup-2', 4, 'Sorry bradda', 'SB', NULL, 35, 6, 'Групповой этап', NULL),
    ('cd-fastcup-2', 5, 'Z', 'Z', NULL, 35, 1, 'Победитель', '1 500 ₽'),
    ('cd-fastcup-2', 6, 'Хомячки', 'HOM', NULL, 35, 3, '3-е место', NULL),

    ('cd-fastcup-3', 1, 'Team Amplify', 'AMP', NULL, NULL, 2, 'Финалист', 'Очки DPC'),
    ('cd-fastcup-3', 2, 'Сколько стиков', 'STK', NULL, NULL, 3, '3–4-е место', 'Очки DPC'),
    ('cd-fastcup-3', 3, 'Z', 'Z', NULL, NULL, 1, 'Победитель', 'Очки DPC'),
    ('cd-fastcup-3', 4, 'Богатый роблокс', 'ROB', NULL, NULL, 4, '3–4-е место', 'Очки DPC'),

    ('cd-fastcup-4', 1, 'уevo играем', 'EVO', NULL, 37, 3, '3-е место', '100 опыта BP × 5'),
    ('cd-fastcup-4', 2, 'пиндосы', 'PND', NULL, 37, 1, 'Победитель', '200 опыта BP × 5'),
    ('cd-fastcup-4', 3, 'Z', 'Z', NULL, 37, 2, 'Финалист', '150 опыта BP × 5'),
    ('cd-fastcup-4', 4, 'огромный байк', 'BIKE', NULL, 37, 4, 'Групповой этап', NULL),

    ('cd-fastcup-6', 1, 'Last Dance', 'LD', NULL, 39, 2, 'Финалист', '500 ₽'),
    ('cd-fastcup-6', 2, 'TTaPaLLIa', 'TTP', NULL, 39, 3, '3-е место', NULL),
    ('cd-fastcup-6', 3, 'My Little Pony', 'MLP', NULL, 39, 4, 'Плей-офф', NULL),
    ('cd-fastcup-6', 4, 'SashiMi', 'SAS', NULL, 39, 1, 'Победитель', '3 000 ₽'),
    ('cd-fastcup-6', 5, 'Liferehab team', 'LRT', NULL, 39, 5, 'Групповой этап', NULL),
    ('cd-fastcup-6', 6, 'Truman prime', 'TRU', NULL, 38, 6, 'Групповой этап', NULL);

INSERT INTO tournament_team_applications (
    tournament_id, team_name, tag, captain_discord_id, contact, logo_key,
    status, selection_method, captain_name_snapshot, team_tier_total_snapshot,
    created_at
)
SELECT
    tournament.id,
    source.team_name,
    source.tag,
    NULL,
    'Архив',
    '',
    'approved',
    'Регистрация',
    source.captain_name,
    source.tier_total,
    tournament.start_at - INTERVAL '1 day' + source.seed * INTERVAL '1 minute'
FROM fastcup_teams source
JOIN tournaments tournament ON tournament.slug = source.slug
WHERE NOT EXISTS (
    SELECT 1
    FROM tournament_team_applications application
    WHERE application.tournament_id = tournament.id
      AND application.team_name = source.team_name
);

CREATE TEMP TABLE fastcup_rosters (
    slug TEXT NOT NULL,
    team_name TEXT NOT NULL,
    nickname TEXT NOT NULL,
    role TEXT NOT NULL,
    tier SMALLINT,
    is_captain BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order SMALLINT NOT NULL,
    PRIMARY KEY (slug, team_name, role)
) ON COMMIT DROP;

INSERT INTO fastcup_rosters VALUES
    ('cd-fastcup-1', 'We''re going to live', 'kretoy', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-1', 'We''re going to live', '143', 'mid_lane', NULL, TRUE, 2),
    ('cd-fastcup-1', 'We''re going to live', 'hvru', 'off_lane', NULL, FALSE, 3),
    ('cd-fastcup-1', 'We''re going to live', '4ubrik', 'soft_support', NULL, FALSE, 4),
    ('cd-fastcup-1', 'We''re going to live', 'Volgar', 'hard_support', NULL, FALSE, 5),
    ('cd-fastcup-1', 'Бананчики', 'Raven', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-1', 'Бананчики', 'ls~', 'mid_lane', NULL, TRUE, 2),
    ('cd-fastcup-1', 'Бананчики', 'кошmurr', 'off_lane', NULL, FALSE, 3),
    ('cd-fastcup-1', 'Бананчики', '#яхочуумереть', 'soft_support', NULL, FALSE, 4),
    ('cd-fastcup-1', 'Бананчики', 'sarasa~', 'hard_support', NULL, FALSE, 5),
    ('cd-fastcup-1', 'DJoKEZS', 'reality', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-1', 'DJoKEZS', 'Helqnux', 'mid_lane', NULL, FALSE, 2),
    ('cd-fastcup-1', 'DJoKEZS', 'lotain', 'off_lane', NULL, TRUE, 3),
    ('cd-fastcup-1', 'DJoKEZS', 'Wasd', 'soft_support', NULL, FALSE, 4),
    ('cd-fastcup-1', 'DJoKEZS', 'Sakana', 'hard_support', NULL, FALSE, 5),
    ('cd-fastcup-1', 'квакун', 'Yoma', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-1', 'квакун', 'Leshy', 'mid_lane', NULL, FALSE, 2),
    ('cd-fastcup-1', 'квакун', 'chep', 'off_lane', NULL, FALSE, 3),
    ('cd-fastcup-1', 'квакун', 'Bel1eve', 'soft_support', NULL, TRUE, 4),
    ('cd-fastcup-1', 'квакун', 'Qpeal', 'hard_support', NULL, FALSE, 5),

    ('cd-fastcup-2', 'Team Amplify', 'iFlopz!', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-2', 'Team Amplify', '10gu', 'mid_lane', NULL, FALSE, 2),
    ('cd-fastcup-2', 'Team Amplify', 'Grega', 'off_lane', NULL, FALSE, 3),
    ('cd-fastcup-2', 'Team Amplify', 'EaseDA', 'soft_support', NULL, FALSE, 4),
    ('cd-fastcup-2', 'Team Amplify', 'swiplash', 'hard_support', NULL, FALSE, 5),
    ('cd-fastcup-2', 'Asakura', 'Fayde', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-2', 'Asakura', '143', 'mid_lane', NULL, FALSE, 2),
    ('cd-fastcup-2', 'Asakura', 'serenity', 'off_lane', NULL, FALSE, 3),
    ('cd-fastcup-2', 'Asakura', 'cy119', 'soft_support', NULL, FALSE, 4),
    ('cd-fastcup-2', 'Asakura', '#яхочуумереть', 'hard_support', NULL, FALSE, 5),
    ('cd-fastcup-2', 'Туалетные бойцы', 'Leprot1kDFD', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-2', 'Туалетные бойцы', 'Leshy', 'mid_lane', NULL, FALSE, 2),
    ('cd-fastcup-2', 'Туалетные бойцы', 'GOLDEN POPI', 'off_lane', NULL, FALSE, 3),
    ('cd-fastcup-2', 'Туалетные бойцы', 'Pancake', 'soft_support', NULL, FALSE, 4),
    ('cd-fastcup-2', 'Туалетные бойцы', 'Mapes', 'hard_support', NULL, FALSE, 5),
    ('cd-fastcup-2', 'Sorry bradda', 'Son1c', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-2', 'Sorry bradda', 'sarasa~', 'mid_lane', NULL, FALSE, 2),
    ('cd-fastcup-2', 'Sorry bradda', 'SKYRIS', 'off_lane', NULL, FALSE, 3),
    ('cd-fastcup-2', 'Sorry bradda', 'frokeng', 'soft_support', NULL, FALSE, 4),
    ('cd-fastcup-2', 'Sorry bradda', 'Linkovatel', 'hard_support', NULL, FALSE, 5),
    ('cd-fastcup-2', 'Z', 'Raven', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-2', 'Z', 'cusdvaqe', 'mid_lane', NULL, FALSE, 2),
    ('cd-fastcup-2', 'Z', 'Gavr', 'off_lane', NULL, FALSE, 3),
    ('cd-fastcup-2', 'Z', 'lotain', 'soft_support', NULL, FALSE, 4),
    ('cd-fastcup-2', 'Z', 'Sakana', 'hard_support', NULL, FALSE, 5),
    ('cd-fastcup-2', 'Хомячки', 'ls~', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-2', 'Хомячки', 'velhiore', 'mid_lane', NULL, FALSE, 2),
    ('cd-fastcup-2', 'Хомячки', 'chep', 'off_lane', NULL, FALSE, 3),
    ('cd-fastcup-2', 'Хомячки', 'sobriety', 'soft_support', NULL, FALSE, 4),
    ('cd-fastcup-2', 'Хомячки', 'unnecessary', 'hard_support', NULL, FALSE, 5),

    ('cd-fastcup-3', 'Team Amplify', 'iFlopz!', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-3', 'Team Amplify', '.flowers', 'mid_lane', NULL, FALSE, 2),
    ('cd-fastcup-3', 'Team Amplify', 'Wuqing', 'off_lane', NULL, FALSE, 3),
    ('cd-fastcup-3', 'Team Amplify', 'Zol', 'soft_support', NULL, FALSE, 4),
    ('cd-fastcup-3', 'Team Amplify', 'Linkovatel', 'hard_support', NULL, FALSE, 5),
    ('cd-fastcup-3', 'Сколько стиков', 'Fayde', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-3', 'Сколько стиков', 'serenity', 'mid_lane', NULL, FALSE, 2),
    ('cd-fastcup-3', 'Сколько стиков', 'mollysorry', 'off_lane', NULL, FALSE, 3),
    ('cd-fastcup-3', 'Сколько стиков', 'shu', 'soft_support', NULL, FALSE, 4),
    ('cd-fastcup-3', 'Сколько стиков', 'cy119', 'hard_support', NULL, FALSE, 5),
    ('cd-fastcup-3', 'Z', 'Compot2282', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-3', 'Z', 'confuse', 'mid_lane', NULL, FALSE, 2),
    ('cd-fastcup-3', 'Z', 'River', 'off_lane', NULL, FALSE, 3),
    ('cd-fastcup-3', 'Z', 'Pancake', 'soft_support', NULL, FALSE, 4),
    ('cd-fastcup-3', 'Z', 'Sakana', 'hard_support', NULL, FALSE, 5),
    ('cd-fastcup-3', 'Богатый роблокс', 'velhiore', 'safe_lane', NULL, FALSE, 1),
    ('cd-fastcup-3', 'Богатый роблокс', 'Leprot1kDFD', 'mid_lane', NULL, FALSE, 2),
    ('cd-fastcup-3', 'Богатый роблокс', 'bananza', 'off_lane', NULL, FALSE, 3),
    ('cd-fastcup-3', 'Богатый роблокс', 'Artem', 'soft_support', NULL, FALSE, 4),
    ('cd-fastcup-3', 'Богатый роблокс', 'Quest_NPC', 'hard_support', NULL, FALSE, 5),

    ('cd-fastcup-4', 'уevo играем', 'Wuqing', 'safe_lane', 9, FALSE, 1),
    ('cd-fastcup-4', 'уevo играем', 'evo', 'mid_lane', 8, FALSE, 2),
    ('cd-fastcup-4', 'уevo играем', 'NL', 'off_lane', 8, FALSE, 3),
    ('cd-fastcup-4', 'уevo играем', 'Linkovatel', 'soft_support', 7, FALSE, 4),
    ('cd-fastcup-4', 'уevo играем', 'cy119', 'hard_support', 5, FALSE, 5),
    ('cd-fastcup-4', 'пиндосы', 'Fayde', 'safe_lane', 10, FALSE, 1),
    ('cd-fastcup-4', 'пиндосы', '.fromoldnuke', 'mid_lane', 8, FALSE, 2),
    ('cd-fastcup-4', 'пиндосы', 'zvёzдочка', 'off_lane', 8, FALSE, 3),
    ('cd-fastcup-4', 'пиндосы', 'ДЕД_ЕСЕНИН', 'soft_support', 5, FALSE, 4),
    ('cd-fastcup-4', 'пиндосы', 'swiplash', 'hard_support', 6, FALSE, 5),
    ('cd-fastcup-4', 'Z', 'confuse', 'safe_lane', 8, FALSE, 1),
    ('cd-fastcup-4', 'Z', 'Yummy', 'mid_lane', 7, FALSE, 2),
    ('cd-fastcup-4', 'Z', 'Gavr', 'off_lane', 8, FALSE, 3),
    ('cd-fastcup-4', 'Z', 'Zol', 'soft_support', 9, FALSE, 4),
    ('cd-fastcup-4', 'Z', 'Pancake', 'hard_support', 5, FALSE, 5),
    ('cd-fastcup-4', 'огромный байк', 'reality', 'safe_lane', 10, FALSE, 1),
    ('cd-fastcup-4', 'огромный байк', '143', 'mid_lane', 8, FALSE, 2),
    ('cd-fastcup-4', 'огромный байк', 'eclipse', 'off_lane', 7, FALSE, 3),
    ('cd-fastcup-4', 'огромный байк', '10gu', 'soft_support', 7, FALSE, 4),
    ('cd-fastcup-4', 'огромный байк', 'N4ZE', 'hard_support', 5, FALSE, 5),

    ('cd-fastcup-6', 'Last Dance', 'Ame''s bastard', 'safe_lane', 10, FALSE, 1),
    ('cd-fastcup-6', 'Last Dance', 'confuse', 'mid_lane', 8, FALSE, 2),
    ('cd-fastcup-6', 'Last Dance', 'Sanraizu', 'off_lane', 8, FALSE, 3),
    ('cd-fastcup-6', 'Last Dance', 'Zol', 'soft_support', 9, FALSE, 4),
    ('cd-fastcup-6', 'Last Dance', 'TBA', 'hard_support', 4, FALSE, 5),
    ('cd-fastcup-6', 'TTaPaLLIa', 'humblegod', 'safe_lane', 7, FALSE, 1),
    ('cd-fastcup-6', 'TTaPaLLIa', 'Pohs', 'mid_lane', 10, FALSE, 2),
    ('cd-fastcup-6', 'TTaPaLLIa', 'Wuqing', 'off_lane', 9, FALSE, 3),
    ('cd-fastcup-6', 'TTaPaLLIa', 'MirrorShard', 'soft_support', 7, FALSE, 4),
    ('cd-fastcup-6', 'TTaPaLLIa', 'ДЕД_ЕСЕНИН', 'hard_support', 6, FALSE, 5),
    ('cd-fastcup-6', 'My Little Pony', 'Ar4ud1ksss', 'safe_lane', 7, FALSE, 1),
    ('cd-fastcup-6', 'My Little Pony', 'lavchik', 'mid_lane', 9, FALSE, 2),
    ('cd-fastcup-6', 'My Little Pony', 'Gavr', 'off_lane', 8, FALSE, 3),
    ('cd-fastcup-6', 'My Little Pony', 'greencat', 'soft_support', 10, FALSE, 4),
    ('cd-fastcup-6', 'My Little Pony', 'Shu', 'hard_support', 5, FALSE, 5),
    ('cd-fastcup-6', 'SashiMi', 'reality', 'safe_lane', 10, FALSE, 1),
    ('cd-fastcup-6', 'SashiMi', 'Shima~', 'mid_lane', 8, FALSE, 2),
    ('cd-fastcup-6', 'SashiMi', 'SKYRIS', 'off_lane', 7, FALSE, 3),
    ('cd-fastcup-6', 'SashiMi', 'Pancake', 'soft_support', 5, FALSE, 4),
    ('cd-fastcup-6', 'SashiMi', 'vhskraaq', 'hard_support', 9, FALSE, 5),
    ('cd-fastcup-6', 'Liferehab team', 'Makeme', 'safe_lane', 8, FALSE, 1),
    ('cd-fastcup-6', 'Liferehab team', '1eqi', 'mid_lane', 10, FALSE, 2),
    ('cd-fastcup-6', 'Liferehab team', 'Dale Cooper', 'off_lane', 8, FALSE, 3),
    ('cd-fastcup-6', 'Liferehab team', 'N4ZE', 'soft_support', 6, FALSE, 4),
    ('cd-fastcup-6', 'Liferehab team', 'Linkovatel', 'hard_support', 7, FALSE, 5),
    ('cd-fastcup-6', 'Truman prime', 'Leeroy', 'safe_lane', 10, FALSE, 1),
    ('cd-fastcup-6', 'Truman prime', 'ASTRA', 'mid_lane', 10, FALSE, 2),
    ('cd-fastcup-6', 'Truman prime', 'Grega', 'off_lane', 8, FALSE, 3),
    ('cd-fastcup-6', 'Truman prime', 'frokeng', 'soft_support', 4, FALSE, 4),
    ('cd-fastcup-6', 'Truman prime', 'dAViHci', 'hard_support', 6, FALSE, 5);

INSERT INTO tournament_roster_snapshots (
    application_id, player_id, nickname_snapshot, role,
    tier_snapshot, is_captain, sort_order
)
SELECT
    application.id,
    matched_player.discord_id,
    roster.nickname,
    roster.role,
    roster.tier,
    roster.is_captain,
    roster.sort_order
FROM fastcup_rosters roster
JOIN tournaments tournament ON tournament.slug = roster.slug
JOIN tournament_team_applications application
  ON application.tournament_id = tournament.id
 AND application.team_name = roster.team_name
LEFT JOIN LATERAL (
    SELECT player.discord_id
    FROM players player
    WHERE LOWER(BTRIM(player.ingame_name)) = LOWER(BTRIM(roster.nickname))
    ORDER BY player.discord_id
    LIMIT 1
) matched_player ON TRUE
ON CONFLICT (application_id, role) DO NOTHING;

CREATE TEMP TABLE fastcup_group_settings (
    slug TEXT PRIMARY KEY,
    team_capacity SMALLINT NOT NULL,
    advance_to_playoff SMALLINT NOT NULL,
    advance_to_upper SMALLINT NOT NULL,
    advance_to_lower SMALLINT NOT NULL
) ON COMMIT DROP;

INSERT INTO fastcup_group_settings VALUES
    ('cd-fastcup-1', 4, 2, 0, 0),
    ('cd-fastcup-2', 6, 4, 2, 2),
    ('cd-fastcup-3', 4, 2, 0, 0),
    ('cd-fastcup-4', 4, 3, 0, 0),
    ('cd-fastcup-6', 6, 4, 2, 2);

INSERT INTO tournament_groups (
    tournament_id, name, sort_order, team_capacity,
    advance_to_playoff, advance_to_upper, advance_to_lower
)
SELECT
    tournament.id,
    'Общая группа',
    1,
    source.team_capacity,
    source.advance_to_playoff,
    source.advance_to_upper,
    source.advance_to_lower
FROM fastcup_group_settings source
JOIN tournaments tournament ON tournament.slug = source.slug
ON CONFLICT (tournament_id, name) DO NOTHING;

CREATE TEMP TABLE fastcup_group_order (
    slug TEXT NOT NULL,
    team_name TEXT NOT NULL,
    sort_order SMALLINT NOT NULL,
    PRIMARY KEY (slug, team_name)
) ON COMMIT DROP;

INSERT INTO fastcup_group_order VALUES
    ('cd-fastcup-1', 'Бананчики', 1),
    ('cd-fastcup-1', 'DJoKEZS', 2),
    ('cd-fastcup-1', 'квакун', 3),
    ('cd-fastcup-1', 'We''re going to live', 4),
    ('cd-fastcup-2', 'Team Amplify', 1),
    ('cd-fastcup-2', 'Хомячки', 2),
    ('cd-fastcup-2', 'Z', 3),
    ('cd-fastcup-2', 'Туалетные бойцы', 4),
    ('cd-fastcup-2', 'Asakura', 5),
    ('cd-fastcup-2', 'Sorry bradda', 6),
    ('cd-fastcup-3', 'Team Amplify', 1),
    ('cd-fastcup-3', 'Z', 2),
    ('cd-fastcup-3', 'Сколько стиков', 3),
    ('cd-fastcup-3', 'Богатый роблокс', 4),
    ('cd-fastcup-4', 'пиндосы', 1),
    ('cd-fastcup-4', 'Z', 2),
    ('cd-fastcup-4', 'уevo играем', 3),
    ('cd-fastcup-4', 'огромный байк', 4),
    ('cd-fastcup-6', 'Last Dance', 1),
    ('cd-fastcup-6', 'SashiMi', 2),
    ('cd-fastcup-6', 'TTaPaLLIa', 3),
    ('cd-fastcup-6', 'My Little Pony', 4),
    ('cd-fastcup-6', 'Liferehab team', 5),
    ('cd-fastcup-6', 'Truman prime', 6);

INSERT INTO tournament_group_teams (group_id, application_id, sort_order)
SELECT
    tournament_group.id,
    application.id,
    source.sort_order
FROM fastcup_group_order source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_groups tournament_group
  ON tournament_group.tournament_id = tournament.id
 AND tournament_group.name = 'Общая группа'
JOIN tournament_team_applications application
  ON application.tournament_id = tournament.id
 AND application.team_name = source.team_name
ON CONFLICT (group_id, application_id) DO NOTHING;

CREATE TEMP TABLE fastcup_matches (
    slug TEXT NOT NULL,
    match_key TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    stage TEXT NOT NULL,
    group_name TEXT,
    team_a TEXT NOT NULL,
    team_b TEXT NOT NULL,
    score_a SMALLINT,
    score_b SMALLINT,
    best_of SMALLINT NOT NULL,
    result_type TEXT NOT NULL DEFAULT 'normal',
    label_a TEXT,
    label_b TEXT,
    decision_note TEXT,
    bracket_round SMALLINT NOT NULL,
    bracket_side TEXT NOT NULL,
    bracket_slot SMALLINT NOT NULL,
    winner_to_key TEXT,
    winner_to_slot CHAR(1),
    loser_to_key TEXT,
    loser_to_slot CHAR(1),
    eliminated_team TEXT,
    sort_order SMALLINT NOT NULL,
    PRIMARY KEY (slug, match_key)
) ON COMMIT DROP;

INSERT INTO fastcup_matches VALUES
    ('cd-fastcup-1', 'g1-1', '2025-02-21 21:30:00+03', 'Групповой этап · Тур 1', 'Общая группа', 'We''re going to live', 'квакун', 0, 1, 1, 'normal', NULL, NULL, NULL, 1, 'group', 1, NULL, NULL, NULL, NULL, NULL, 1),
    ('cd-fastcup-1', 'g1-2', '2025-02-21 21:30:00+03', 'Групповой этап · Тур 1', 'Общая группа', 'Бананчики', 'DJoKEZS', 1, 0, 1, 'normal', NULL, NULL, NULL, 1, 'group', 2, NULL, NULL, NULL, NULL, NULL, 2),
    ('cd-fastcup-1', 'g2-1', '2025-02-21 22:45:00+03', 'Групповой этап · Тур 2', 'Общая группа', 'We''re going to live', 'Бананчики', 1, 0, 1, 'normal', NULL, NULL, NULL, 2, 'group', 1, NULL, NULL, NULL, NULL, NULL, 3),
    ('cd-fastcup-1', 'g2-2', '2025-02-21 22:45:00+03', 'Групповой этап · Тур 2', 'Общая группа', 'квакун', 'DJoKEZS', 0, 1, 1, 'normal', NULL, NULL, NULL, 2, 'group', 2, NULL, NULL, NULL, NULL, NULL, 4),
    ('cd-fastcup-1', 'g3-1', '2025-02-22 19:30:00+03', 'Групповой этап · Тур 3', 'Общая группа', 'We''re going to live', 'DJoKEZS', 0, 1, 1, 'normal', NULL, NULL, NULL, 3, 'group', 1, NULL, NULL, NULL, NULL, NULL, 5),
    ('cd-fastcup-1', 'g3-2', '2025-02-22 19:30:00+03', 'Групповой этап · Тур 3', 'Общая группа', 'Бананчики', 'квакун', 1, 0, 1, 'normal', NULL, NULL, NULL, 3, 'group', 2, NULL, NULL, NULL, NULL, NULL, 6),
    ('cd-fastcup-1', 'gf', '2025-02-22 20:45:00+03', 'Гранд-финал', NULL, 'DJoKEZS', 'Бананчики', 0, 2, 3, 'normal', NULL, NULL, NULL, 1, 'grand_final', 1, NULL, NULL, NULL, NULL, 'DJoKEZS', 7),

    ('cd-fastcup-2', 'g1-1', '2025-05-01 20:30:00+03', 'Групповой этап · Тур 1', 'Общая группа', 'Asakura', 'Sorry bradda', 1, 0, 1, 'normal', NULL, NULL, NULL, 1, 'group', 1, NULL, NULL, NULL, NULL, NULL, 1),
    ('cd-fastcup-2', 'g1-2', '2025-05-01 20:30:00+03', 'Групповой этап · Тур 1', 'Общая группа', 'Туалетные бойцы', 'Z', 0, 1, 1, 'normal', NULL, NULL, NULL, 1, 'group', 2, NULL, NULL, NULL, NULL, NULL, 2),
    ('cd-fastcup-2', 'g1-3', '2025-05-01 20:30:00+03', 'Групповой этап · Тур 1', 'Общая группа', 'Team Amplify', 'Хомячки', NULL, NULL, 1, 'technical', 'tw', 'tl', 'Техническая победа Team Amplify.', 1, 'group', 3, NULL, NULL, NULL, NULL, NULL, 3),
    ('cd-fastcup-2', 'g2-1', '2025-05-01 21:45:00+03', 'Групповой этап · Тур 2', 'Общая группа', 'Asakura', 'Z', 0, 1, 1, 'normal', NULL, NULL, NULL, 2, 'group', 1, NULL, NULL, NULL, NULL, NULL, 4),
    ('cd-fastcup-2', 'g2-2', '2025-05-01 21:45:00+03', 'Групповой этап · Тур 2', 'Общая группа', 'Sorry bradda', 'Хомячки', 0, 1, 1, 'normal', NULL, NULL, NULL, 2, 'group', 2, NULL, NULL, NULL, NULL, NULL, 5),
    ('cd-fastcup-2', 'g2-3', '2025-05-01 21:45:00+03', 'Групповой этап · Тур 2', 'Общая группа', 'Team Amplify', 'Туалетные бойцы', 1, 0, 1, 'normal', NULL, NULL, NULL, 2, 'group', 3, NULL, NULL, NULL, NULL, NULL, 6),
    ('cd-fastcup-2', 'g3-1', '2025-05-01 23:00:00+03', 'Групповой этап · Тур 3', 'Общая группа', 'Asakura', 'Хомячки', 0, 1, 1, 'normal', NULL, NULL, NULL, 3, 'group', 1, NULL, NULL, NULL, NULL, NULL, 7),
    ('cd-fastcup-2', 'g3-2', '2025-05-01 23:00:00+03', 'Групповой этап · Тур 3', 'Общая группа', 'Туалетные бойцы', 'Sorry bradda', 1, 0, 1, 'normal', NULL, NULL, NULL, 3, 'group', 2, NULL, NULL, NULL, NULL, NULL, 8),
    ('cd-fastcup-2', 'g3-3', '2025-05-01 23:00:00+03', 'Групповой этап · Тур 3', 'Общая группа', 'Team Amplify', 'Z', 1, 0, 1, 'normal', NULL, NULL, NULL, 3, 'group', 3, NULL, NULL, NULL, NULL, NULL, 9),
    ('cd-fastcup-2', 'po1-upper', '2025-05-02 20:30:00+03', 'Плей-офф · Верхняя сетка', NULL, 'Team Amplify', 'Хомячки', 2, 1, 3, 'normal', NULL, NULL, 'Серия началась со счёта 1:0 в пользу Team Amplify.', 1, 'upper', 1, 'gf', 'a', 'po2-lower', 'a', NULL, 10),
    ('cd-fastcup-2', 'po1-lower', '2025-05-02 20:30:00+03', 'Плей-офф · Нижняя сетка', NULL, 'Z', 'Туалетные бойцы', 2, 0, 3, 'normal', NULL, NULL, 'Серия началась со счёта 1:0 в пользу Z.', 1, 'lower', 1, 'po2-lower', 'b', NULL, NULL, 'Туалетные бойцы', 11),
    ('cd-fastcup-2', 'po2-lower', '2025-05-02 23:00:00+03', 'Плей-офф · Матч за выход в финал', NULL, 'Хомячки', 'Z', 0, 1, 1, 'normal', NULL, NULL, NULL, 2, 'lower', 1, 'gf', 'b', NULL, NULL, 'Хомячки', 12),
    ('cd-fastcup-2', 'gf', '2025-05-03 21:00:00+03', 'Гранд-финал', NULL, 'Team Amplify', 'Z', 0, 2, 3, 'normal', NULL, NULL, NULL, 3, 'grand_final', 1, NULL, NULL, NULL, NULL, 'Team Amplify', 13),

    ('cd-fastcup-3', 'g1-1', '2025-07-11 21:00:00+03', 'Групповой этап · Тур 1', 'Общая группа', 'Team Amplify', 'Богатый роблокс', 2, 0, 2, 'normal', NULL, NULL, NULL, 1, 'group', 1, NULL, NULL, NULL, NULL, NULL, 1),
    ('cd-fastcup-3', 'g1-2', '2025-07-11 21:00:00+03', 'Групповой этап · Тур 1', 'Общая группа', 'Сколько стиков', 'Z', 1, 1, 2, 'normal', NULL, NULL, NULL, 1, 'group', 2, NULL, NULL, NULL, NULL, NULL, 2),
    ('cd-fastcup-3', 'g2-1', '2025-07-12 20:00:00+03', 'Групповой этап · Тур 2', 'Общая группа', 'Team Amplify', 'Сколько стиков', 2, 0, 2, 'normal', NULL, NULL, NULL, 2, 'group', 1, NULL, NULL, NULL, NULL, NULL, 3),
    ('cd-fastcup-3', 'g2-2', '2025-07-12 20:00:00+03', 'Групповой этап · Тур 2', 'Общая группа', 'Богатый роблокс', 'Z', 0, 2, 2, 'normal', NULL, NULL, NULL, 2, 'group', 2, NULL, NULL, NULL, NULL, NULL, 4),
    ('cd-fastcup-3', 'g3-1', '2025-07-12 22:30:00+03', 'Групповой этап · Тур 3', 'Общая группа', 'Богатый роблокс', 'Сколько стиков', 0, 2, 2, 'technical', 'tl', NULL, 'Техническое поражение команды «Богатый роблокс».', 3, 'group', 1, NULL, NULL, NULL, NULL, NULL, 5),
    ('cd-fastcup-3', 'g3-2', '2025-07-12 22:30:00+03', 'Групповой этап · Тур 3', 'Общая группа', 'Team Amplify', 'Z', 1, 1, 2, 'normal', NULL, NULL, NULL, 3, 'group', 2, NULL, NULL, NULL, NULL, NULL, 6),
    ('cd-fastcup-3', 'gf', '2025-07-13 21:15:00+03', 'Гранд-финал', NULL, 'Z', 'Team Amplify', 2, 1, 3, 'normal', NULL, NULL, NULL, 1, 'grand_final', 1, NULL, NULL, NULL, NULL, 'Team Amplify', 7),

    ('cd-fastcup-4', 'g1-1', '2025-10-25 20:30:00+03', 'Групповой этап · Тур 1', 'Общая группа', 'пиндосы', 'Z', 1, 0, 1, 'normal', NULL, NULL, NULL, 1, 'group', 1, NULL, NULL, NULL, NULL, NULL, 1),
    ('cd-fastcup-4', 'g1-2', '2025-10-25 20:30:00+03', 'Групповой этап · Тур 1', 'Общая группа', 'уevo играем', 'огромный байк', 1, 0, 1, 'normal', NULL, NULL, NULL, 1, 'group', 2, NULL, NULL, NULL, NULL, NULL, 2),
    ('cd-fastcup-4', 'g2-1', '2025-10-25 21:45:00+03', 'Групповой этап · Тур 2', 'Общая группа', 'пиндосы', 'уevo играем', 1, 0, 1, 'normal', NULL, NULL, NULL, 2, 'group', 1, NULL, NULL, NULL, NULL, NULL, 3),
    ('cd-fastcup-4', 'g2-2', '2025-10-25 21:45:00+03', 'Групповой этап · Тур 2', 'Общая группа', 'Z', 'огромный байк', 1, 0, 1, 'normal', NULL, NULL, NULL, 2, 'group', 2, NULL, NULL, NULL, NULL, NULL, 4),
    ('cd-fastcup-4', 'g3-1', '2025-10-25 23:00:00+03', 'Групповой этап · Тур 3', 'Общая группа', 'пиндосы', 'огромный байк', 1, 0, 1, 'normal', NULL, NULL, 'Счёт восстановлен по итоговой таблице группы.', 3, 'group', 1, NULL, NULL, NULL, NULL, NULL, 5),
    ('cd-fastcup-4', 'g3-2', '2025-10-25 23:00:00+03', 'Групповой этап · Тур 3', 'Общая группа', 'уevo играем', 'Z', 0, 1, 1, 'normal', NULL, NULL, NULL, 3, 'group', 2, NULL, NULL, NULL, NULL, NULL, 6),
    ('cd-fastcup-4', 'sf', '2025-10-26 20:00:00+03', 'Плей-офф · Полуфинал', NULL, 'Z', 'уevo играем', 1, 0, 1, 'normal', NULL, NULL, NULL, 1, 'upper', 1, 'gf', 'b', NULL, NULL, 'уevo играем', 7),
    ('cd-fastcup-4', 'gf', '2025-10-26 21:15:00+03', 'Гранд-финал', NULL, 'пиндосы', 'Z', 2, 1, 3, 'normal', NULL, NULL, NULL, 2, 'grand_final', 1, NULL, NULL, NULL, NULL, 'Z', 8),

    ('cd-fastcup-6', 'g1-1', '2026-07-10 20:00:00+03', 'Групповой этап · Тур 1', 'Общая группа', 'TTaPaLLIa', 'Truman prime', 1, 0, 1, 'normal', NULL, NULL, NULL, 1, 'group', 1, NULL, NULL, NULL, NULL, NULL, 1),
    ('cd-fastcup-6', 'g1-2', '2026-07-10 20:00:00+03', 'Групповой этап · Тур 1', 'Общая группа', 'Last Dance', 'My Little Pony', 1, 0, 1, 'normal', NULL, NULL, NULL, 1, 'group', 2, NULL, NULL, NULL, NULL, NULL, 2),
    ('cd-fastcup-6', 'g1-3', '2026-07-10 20:00:00+03', 'Групповой этап · Тур 1', 'Общая группа', 'SashiMi', 'Liferehab team', 1, 0, 1, 'normal', NULL, NULL, NULL, 1, 'group', 3, NULL, NULL, NULL, NULL, NULL, 3),
    ('cd-fastcup-6', 'g2-1', '2026-07-10 21:15:00+03', 'Групповой этап · Тур 2', 'Общая группа', 'Last Dance', 'Truman prime', 1, 0, 1, 'normal', NULL, NULL, NULL, 2, 'group', 1, NULL, NULL, NULL, NULL, NULL, 4),
    ('cd-fastcup-6', 'g2-2', '2026-07-10 21:15:00+03', 'Групповой этап · Тур 2', 'Общая группа', 'SashiMi', 'My Little Pony', 0, 1, 1, 'normal', NULL, NULL, NULL, 2, 'group', 2, NULL, NULL, NULL, NULL, NULL, 5),
    ('cd-fastcup-6', 'g2-3', '2026-07-10 21:15:00+03', 'Групповой этап · Тур 2', 'Общая группа', 'TTaPaLLIa', 'Liferehab team', 1, 0, 1, 'normal', NULL, NULL, NULL, 2, 'group', 3, NULL, NULL, NULL, NULL, NULL, 6),
    ('cd-fastcup-6', 'g3-1', '2026-07-10 22:30:00+03', 'Групповой этап · Тур 3', 'Общая группа', 'SashiMi', 'Truman prime', 1, 0, 1, 'normal', NULL, NULL, NULL, 3, 'group', 1, NULL, NULL, NULL, NULL, NULL, 7),
    ('cd-fastcup-6', 'g3-2', '2026-07-10 22:30:00+03', 'Групповой этап · Тур 3', 'Общая группа', 'Last Dance', 'TTaPaLLIa', 1, 0, 1, 'normal', NULL, NULL, NULL, 3, 'group', 2, NULL, NULL, NULL, NULL, NULL, 8),
    ('cd-fastcup-6', 'g3-3', '2026-07-10 22:30:00+03', 'Групповой этап · Тур 3', 'Общая группа', 'My Little Pony', 'Liferehab team', 1, 0, 1, 'normal', NULL, NULL, NULL, 3, 'group', 3, NULL, NULL, NULL, NULL, NULL, 9),
    ('cd-fastcup-6', 'wr', '2026-07-11 19:00:00+03', 'Плей-офф · Верхняя сетка', NULL, 'Last Dance', 'SashiMi', NULL, NULL, 1, 'forfeit', 'ff', 'w', 'Last Dance отказались от матча.', 1, 'upper', 1, 'gf', 'a', 'lr2', 'a', NULL, 10),
    ('cd-fastcup-6', 'lr1', '2026-07-11 19:00:00+03', 'Плей-офф · Нижняя сетка · Раунд 1', NULL, 'TTaPaLLIa', 'My Little Pony', 1, 0, 1, 'normal', NULL, NULL, NULL, 1, 'lower', 1, 'lr2', 'b', NULL, NULL, 'My Little Pony', 11),
    ('cd-fastcup-6', 'lr2', '2026-07-11 20:15:00+03', 'Плей-офф · Нижняя сетка · Раунд 2', NULL, 'Last Dance', 'TTaPaLLIa', NULL, NULL, 3, 'forfeit', 'w', 'ff', 'TTaPaLLIa отказались от матча.', 2, 'lower', 1, 'gf', 'b', NULL, NULL, 'TTaPaLLIa', 12),
    ('cd-fastcup-6', 'gf', '2026-07-12 20:00:00+03', 'Гранд-финал', NULL, 'SashiMi', 'Last Dance', 2, 0, 3, 'normal', NULL, NULL, NULL, 3, 'grand_final', 1, NULL, NULL, NULL, NULL, 'Last Dance', 13);

INSERT INTO tournament_matches (
    tournament_id, group_id, scheduled_at, stage,
    team_a_application_id, team_b_application_id,
    team_a_score, team_b_score, best_of, status, sort_order,
    result_type, team_a_result_label, team_b_result_label, decision_note,
    bracket_round, bracket_side, bracket_slot,
    eliminated_team_application_id
)
SELECT
    tournament.id,
    tournament_group.id,
    source.scheduled_at,
    source.stage,
    team_a.id,
    team_b.id,
    source.score_a,
    source.score_b,
    source.best_of,
    'finished',
    source.sort_order,
    source.result_type,
    source.label_a,
    source.label_b,
    source.decision_note,
    source.bracket_round,
    source.bracket_side,
    source.bracket_slot,
    eliminated_team.id
FROM fastcup_matches source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_team_applications team_a
  ON team_a.tournament_id = tournament.id
 AND team_a.team_name = source.team_a
JOIN tournament_team_applications team_b
  ON team_b.tournament_id = tournament.id
 AND team_b.team_name = source.team_b
LEFT JOIN tournament_groups tournament_group
  ON tournament_group.tournament_id = tournament.id
 AND tournament_group.name = source.group_name
LEFT JOIN tournament_team_applications eliminated_team
  ON eliminated_team.tournament_id = tournament.id
 AND eliminated_team.team_name = source.eliminated_team
WHERE NOT EXISTS (
    SELECT 1
    FROM tournament_matches existing
    WHERE existing.tournament_id = tournament.id
      AND existing.sort_order = source.sort_order
);

UPDATE tournament_matches source_match
SET
    winner_to_match_id = winner_match.id,
    winner_to_slot = source.winner_to_slot,
    loser_to_match_id = loser_match.id,
    loser_to_slot = source.loser_to_slot
FROM fastcup_matches source
JOIN tournaments tournament ON tournament.slug = source.slug
LEFT JOIN fastcup_matches winner_source
  ON winner_source.slug = source.slug
 AND winner_source.match_key = source.winner_to_key
LEFT JOIN tournament_matches winner_match
  ON winner_match.tournament_id = tournament.id
 AND winner_match.sort_order = winner_source.sort_order
LEFT JOIN fastcup_matches loser_source
  ON loser_source.slug = source.slug
 AND loser_source.match_key = source.loser_to_key
LEFT JOIN tournament_matches loser_match
  ON loser_match.tournament_id = tournament.id
 AND loser_match.sort_order = loser_source.sort_order
WHERE source_match.tournament_id = tournament.id
  AND source_match.sort_order = source.sort_order
  AND (source.winner_to_key IS NOT NULL OR source.loser_to_key IS NOT NULL);

CREATE TEMP TABLE fastcup_rules (
    slug TEXT NOT NULL,
    sort_order SMALLINT NOT NULL,
    rule_text TEXT NOT NULL,
    PRIMARY KEY (slug, sort_order)
) ON COMMIT DROP;

INSERT INTO fastcup_rules VALUES
    ('cd-fastcup-1', 1, $rule$Регистрация на турнир проходит через форму.$rule$),
    ('cd-fastcup-1', 2, $rule$Регистрировать на турнир в составах команд можно только игроков, заигранных ранее на турнирах Linken's Sphere. Исключение — один слот в команде может занять легионер.$rule$),
    ('cd-fastcup-1', 3, $rule$При регистрации команды сумма тиров всех 5 игроков должна составлять не более 34. Если в команде присутствуют 3 или более игроков-джокеров, сумма тиров увеличивается до 35.$rule$),
    ('cd-fastcup-1', 4, $rule$Команде разрешено сделать не более одной замены. Воспользоваться заменой можно на одной карте за турнир. Замену нужно согласовать с организатором.$rule$),
    ('cd-fastcup-1', 5, $rule$На турнире предусмотрено 4 слота для команд. При большем числе команд турнир может быть расширен до 6 команд, а формат — изменён.$rule$),
    ('cd-fastcup-1', 6, $rule$Матч проводится на сервере Стокгольм и недоступен для зрителей, турнирного билета нет. Через друзей можно смотреть матч с задержкой 2 минуты.$rule$),
    ('cd-fastcup-1', 7, $rule$Правила выбора стороны и очередности пика аналогичны другим серверным турнирам. В BO1 используется монетка. В BO3 на первой и третьей картах используется монетка, а на второй первой выбирает сторону или очередность пика команда, проигравшая бросок монетки на первой карте. При наличии игрока-джокера право выбора получает его команда; если джокеров несколько, преимущество у команды с большим их числом.$rule$),
    ('cd-fastcup-1', 8, $rule$Дата и время старта матчей указаны в расписании. Опоздание до 10 минут — без штрафа; от 10 до 20 минут — штраф бонусного времени 2-го уровня; от 20 до 30 минут — штраф 3-го уровня и право выбора стороны или очереди пика на первых двух картах у соперника; более 30 минут — техническое поражение на первой карте и штрафы на оставшихся картах. Присутствие команды означает одновременное нахождение 5 игроков в слотах лобби и голосовом канале.$rule$),
    ('cd-fastcup-1', 9, $rule$Пауза — не более 15 минут на команду в BO1 и не более 25 минут на команду за серию BO3.$rule$),
    ('cd-fastcup-1', 10, $rule$Для участия игроки устанавливают в Steam и игровом клиенте свой серверный ник. При его отсутствии нужно пройти регистрацию на сервере.$rule$),
    ('cd-fastcup-1', 11, $rule$Каждая команда обязана создать команду в клиенте игры.$rule$),
    ('cd-fastcup-1', 12, $rule$Одобренные зарегистрированные команды публикуются в разделе «Составы».$rule$),
    ('cd-fastcup-1', 13, $rule$Легионерами считаются игроки, не заигранные в серверных сезонных турнирах и сыгравшие менее 50 рейтинговых игр за последние 3 месяца. Для регистрации легионеру нужно присвоить тир у организатора.$rule$),
    ('cd-fastcup-1', 14, $rule$Правила могут дополняться как до, так и в ходе турнира.$rule$),

    ('cd-fastcup-2', 1, $rule$Зарегистрировать состав можно через личное сообщение @frokeng в Discord. Нужно указать никнеймы игроков и их номинальные роли.$rule$),
    ('cd-fastcup-2', 2, $rule$Турнир только для Boosty-подписчиков. У некоторых игроков с уровнями поддержки сервера 1 и 2 есть возможность предоставить подписочные слоты игрокам без Boosty, но не более 2 на команду.$rule$),
    ('cd-fastcup-2', 3, $rule$Любому игроку может быть отказано в участии без объяснения причин. Турнирные тиры устанавливаются организатором и не подлежат обсуждению.$rule$),
    ('cd-fastcup-2', 4, $rule$Регистрировать можно только участников со страницы «Тир игроков». Сумма тиров 5 игроков должна быть не более 35; при 3 и более игроках-джокерах лимит увеличивается до 36.$rule$),
    ('cd-fastcup-2', 5, $rule$Команде разрешено сделать не более одной замены. Воспользоваться заменой можно на одной карте за турнир. Замену нужно согласовать с организатором.$rule$),
    ('cd-fastcup-2', 6, $rule$На турнире предусмотрено 6 слотов для команд.$rule$),
    ('cd-fastcup-2', 7, $rule$Матч проводится на сервере Стокгольм и недоступен в разделе «Просмотр», турнирного билета нет. Через друзей можно смотреть матч с задержкой 2 минуты.$rule$),
    ('cd-fastcup-2', 8, $rule$В BO1 используется монетка. В первых сериях BO3 плей-офф, которые начинаются со счёта 1:0, право выбора стороны и пика на обеих картах получает отстающая команда. В остальных BO3 на первой и третьей картах используется монетка, а на второй первой выбирает проигравшая первый бросок команда. Игрок-джокер даёт команде право один раз за турнир перевернуть неудачную монетку; два и более джокера дают дополнительный бан.$rule$),
    ('cd-fastcup-2', 9, $rule$Опоздание до 5 минут — без штрафа; от 6 до 15 минут — дополнительный бан для соперника; от 16 до 25 минут — соперник предлагает 3 героев на первый выбор; более 25 минут — техническое поражение на первой карте и дополнительные штрафы. Присутствие команды означает одновременное нахождение 5 игроков в слотах лобби и голосовом канале.$rule$),
    ('cd-fastcup-2', 10, $rule$Пауза — не более 15 минут на команду в BO1 и не более 25 минут на команду за серию BO3.$rule$),
    ('cd-fastcup-2', 11, $rule$Для участия игроки устанавливают в Steam и игровом клиенте свой серверный ник. При его отсутствии нужно пройти регистрацию на сервере.$rule$),
    ('cd-fastcup-2', 12, $rule$Каждая команда обязана создать команду в клиенте игры.$rule$),
    ('cd-fastcup-2', 13, $rule$Одобренные зарегистрированные команды публикуются в разделе «Составы».$rule$),
    ('cd-fastcup-2', 14, $rule$Правила могут дополняться как до, так и в ходе турнира.$rule$),

    ('cd-fastcup-3', 1, $rule$Регистрация проходит через @frokeng в личных сообщениях Discord в формате: название команды и 5 никнеймов по ролям.$rule$),
    ('cd-fastcup-3', 2, $rule$Регистрировать можно только игроков, ранее участвовавших в турнирах Linken's Sphere. Один слот в команде может занять легионер.$rule$),
    ('cd-fastcup-3', 3, $rule$Сумма тиров 5 игроков должна быть не более 35. Игроков 10-го тира может быть не более одного на команду.$rule$),
    ('cd-fastcup-3', 4, $rule$Команде разрешено сделать не более одной замены. Воспользоваться заменой можно на одной карте за турнир. Замену нужно согласовать с организатором.$rule$),
    ('cd-fastcup-3', 5, $rule$На турнире предусмотрено 4 слота. При большем числе команд турнир может быть расширен до 6 команд, а формат — изменён.$rule$),
    ('cd-fastcup-3', 6, $rule$Матч проводится на сервере Стокгольм с турнирным билетом и доступен зрителям с задержкой 5 минут.$rule$),
    ('cd-fastcup-3', 7, $rule$В BO1 используется монетка. В BO2 на первой карте используется монетка, а на второй сторону или очередность пика выбирает проигравшая бросок команда. В BO3 действует тот же порядок, а на третьей карте снова используется монетка.$rule$),
    ('cd-fastcup-3', 8, $rule$Опоздание до 10 минут — без штрафа; от 10 до 20 минут — соперник выбирает аспект последнего выбранного героя нарушителей; от 20 до 30 минут — соперник получает выбор стороны и очереди пика на серию и выбирает аспект на первой карте; более 30 минут — техническое поражение на первой карте и дополнительные штрафы.$rule$),
    ('cd-fastcup-3', 9, $rule$Пауза — не более 15 минут на команду в BO1 и не более 25 минут на команду за серию BO3.$rule$),
    ('cd-fastcup-3', 10, $rule$Для участия игроки устанавливают в Steam и игровом клиенте свой серверный ник. При его отсутствии нужно пройти регистрацию на сервере.$rule$),
    ('cd-fastcup-3', 11, $rule$Каждая команда обязана создать команду в клиенте игры.$rule$),
    ('cd-fastcup-3', 12, $rule$Одобренные зарегистрированные команды публикуются в разделе «Составы».$rule$),
    ('cd-fastcup-3', 13, $rule$Легионерами считаются игроки, не заигранные в серверном DPC-межсезонье и сыгравшие менее 60 рейтинговых игр за последние 3 месяца. Исключения: Sakana, Gavr, ПОДПИВАС, Bel1eve, Ramp, Mapes, TeMan, GOLDEN POPI, vhskraaq, wispiq, reality.$rule$),
    ('cd-fastcup-3', 14, $rule$Правила могут дополняться как до, так и в ходе турнира.$rule$),

    ('cd-fastcup-4', 1, $rule$Регистрация проходит через @frokeng в личных сообщениях Discord в формате: название команды и 5 никнеймов по ролям.$rule$),
    ('cd-fastcup-4', 2, $rule$Регистрировать можно только игроков, участвовавших в ивентах летнего DPC-межсезонья Linken's Sphere. Один слот может занять легионер; 24–25 октября разрешалось взять двух легионеров.$rule$),
    ('cd-fastcup-4', 3, $rule$Сумма тиров 5 игроков должна быть не более 37. Если в команде более одного игрока 9–10-го тира, лимит сокращается до 36.$rule$),
    ('cd-fastcup-4', 4, $rule$Каждый участник должен иметь Boosty-подписку Linken's Sphere. Игрок с уровнем поддержки 1 или 2 мог предоставить один слот игроку без подписки.$rule$),
    ('cd-fastcup-4', 5, $rule$Команде разрешено сделать не более одной замены. Воспользоваться заменой можно на одной карте за турнир. Замену нужно согласовать с организатором.$rule$),
    ('cd-fastcup-4', 6, $rule$На турнире предусмотрено 4 слота. При большем числе команд турнир может быть расширен до 6 команд, а формат — изменён.$rule$),
    ('cd-fastcup-4', 7, $rule$Матч проводится на сервере Стокгольм без турнирного билета. Через друзей его можно смотреть с задержкой 2 минуты.$rule$),
    ('cd-fastcup-4', 8, $rule$В BO1 используется монетка. В BO2 на первой карте используется монетка, а на второй сторону или очередность пика выбирает проигравшая бросок команда. В BO3 действует тот же порядок, а на третьей карте снова используется монетка.$rule$),
    ('cd-fastcup-4', 9, $rule$Опоздание до 10 минут — без штрафа; от 10 до 20 минут — соперник выбирает аспект последнего выбранного героя нарушителей на первой карте; от 20 до 30 минут — соперник получает выбор стороны и очереди пика на серию и выбирает аспект на первой карте; более 30 минут — техническое поражение на первой карте и дополнительные штрафы.$rule$),
    ('cd-fastcup-4', 10, $rule$Пауза — не более 15 минут на команду в BO1 и не более 25 минут на команду за серию BO3.$rule$),
    ('cd-fastcup-4', 11, $rule$Тай-брейк для 3 команд играется на карте Overthrow 3.0 (5 × 3). При равенстве двух команд выше ставится победитель личной встречи.$rule$),
    ('cd-fastcup-4', 12, $rule$Для участия игроки устанавливают в Steam и игровом клиенте свой серверный ник. При его отсутствии нужно пройти регистрацию на сервере.$rule$),
    ('cd-fastcup-4', 13, $rule$Каждая команда обязана создать команду в клиенте игры.$rule$),
    ('cd-fastcup-4', 14, $rule$Одобренные зарегистрированные команды публикуются в разделе «Составы».$rule$),
    ('cd-fastcup-4', 15, $rule$Легионерами считаются игроки, не участвовавшие в турах лиги 7-го сезона и сыгравшие менее 60 рейтинговых игр за последние 3 месяца.$rule$),
    ('cd-fastcup-4', 16, $rule$Правила могут дополняться как до, так и в ходе турнира.$rule$),

    ('cd-fastcup-6', 1, $rule$Зарегистрировать состав можно через личное сообщение @frokeng в Discord. Нужно указать никнеймы игроков и их номинальные роли.$rule$),
    ('cd-fastcup-6', 2, $rule$Турнир только для Boosty-подписчиков. Команда должна внести взнос 500 ₽ через @frokeng; игроки не из РФ могут внести его через специальную цель на Boosty.$rule$),
    ('cd-fastcup-6', 3, $rule$Любому игроку может быть отказано в участии без объяснения причин. Турнирные тиры устанавливаются организатором и не подлежат обсуждению.$rule$),
    ('cd-fastcup-6', 4, $rule$Регистрировать можно только участников со страницы «Тир игроков». Сумма тиров 5 игроков должна быть не более 39. Легионерам рангов Герой–Властелин на дни турнира предоставляется пробная подписка «Руна Воды».$rule$),
    ('cd-fastcup-6', 5, $rule$Команде разрешено сделать не более одной замены на один игровой день. Замену нужно согласовать с организатором. В случае форс-мажора организатор может разрешить дополнительные замены.$rule$),
    ('cd-fastcup-6', 6, $rule$Изначально предусматривалось 8 слотов с возможностью сокращения до 4–6 команд и изменения призового фонда.$rule$),
    ('cd-fastcup-6', 7, $rule$Матч проводится на сервере Стокгольм с турнирным билетом.$rule$),
    ('cd-fastcup-6', 8, $rule$Правила выбора стороны и очередности пика аналогичны другим серверным турнирам.$rule$),
    ('cd-fastcup-6', 9, $rule$Опоздание до 5 минут — без штрафа; от 11 до 20 минут — дополнительный бан для соперника; от 21 до 30 минут — соперник предлагает 3 героев на первый выбор; более 31 минуты — техническое поражение на первой карте и дополнительные штрафы. Присутствие команды означает одновременное нахождение 5 игроков в слотах лобби и голосовом канале.$rule$),
    ('cd-fastcup-6', 10, $rule$При равенстве результата места определяются последовательно по личной встрече или переигровке, если личной встречи не было, и тай-брейку в Overthrow 3.0 для трёх команд.$rule$),
    ('cd-fastcup-6', 11, $rule$Пауза — не более 15 минут на команду в BO1 и не более 25 минут на команду за серию BO3.$rule$),
    ('cd-fastcup-6', 12, $rule$Для участия игроки устанавливают в Steam и игровом клиенте свой серверный ник. При его отсутствии нужно пройти регистрацию на сервере.$rule$),
    ('cd-fastcup-6', 13, $rule$В команде может быть не более 2 легионеров. Легионер — игрок, не сыгравший на серверных ивентах 8-го сезона и в матчах 1–2-го туров межсезонной лиги. Исключения: Sakana, Mapes, Ramp, Игрок.$rule$),
    ('cd-fastcup-6', 14, $rule$Каждая команда обязана создать команду в клиенте игры.$rule$),
    ('cd-fastcup-6', 15, $rule$Одобренные зарегистрированные команды публикуются в разделе «Составы».$rule$),
    ('cd-fastcup-6', 16, $rule$Правила могут дополняться как до, так и в ходе турнира.$rule$);

INSERT INTO tournament_rules (tournament_id, sort_order, rule_text)
SELECT tournament.id, source.sort_order, source.rule_text
FROM fastcup_rules source
JOIN tournaments tournament ON tournament.slug = source.slug
ON CONFLICT (tournament_id, sort_order) DO NOTHING;

INSERT INTO tournament_team_results (application_id, placement, result_label)
SELECT application.id, source.placement, source.result_label
FROM fastcup_teams source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_team_applications application
  ON application.tournament_id = tournament.id
 AND application.team_name = source.team_name
ON CONFLICT (application_id) DO NOTHING;

INSERT INTO tournament_prizes (
    tournament_id, placement, application_id, team_name_snapshot, prize_text
)
SELECT
    tournament.id,
    source.placement,
    application.id,
    source.team_name,
    source.prize_text
FROM fastcup_teams source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_team_applications application
  ON application.tournament_id = tournament.id
 AND application.team_name = source.team_name
WHERE source.placement IS NOT NULL
ON CONFLICT (tournament_id, placement) DO NOTHING;

CREATE TEMP TABLE fastcup_schedule (
    slug TEXT NOT NULL,
    day_date DATE NOT NULL,
    day_title TEXT NOT NULL,
    day_order SMALLINT NOT NULL,
    start_time TIME NOT NULL,
    stage_name TEXT NOT NULL,
    match_count SMALLINT NOT NULL,
    series_format TEXT NOT NULL,
    entry_order SMALLINT NOT NULL,
    PRIMARY KEY (slug, day_order, entry_order)
) ON COMMIT DROP;

INSERT INTO fastcup_schedule VALUES
    ('cd-fastcup-1', '2025-02-21', 'День 1', 1, '21:30', 'Групповой этап · Раунд 1', 2, 'BO1', 1),
    ('cd-fastcup-1', '2025-02-21', 'День 1', 1, '22:45', 'Групповой этап · Раунд 2', 2, 'BO1', 2),
    ('cd-fastcup-1', '2025-02-22', 'День 2', 2, '19:30', 'Групповой этап · Раунд 3', 2, 'BO1', 1),
    ('cd-fastcup-1', '2025-02-22', 'День 2', 2, '20:45', 'Гранд-финал', 1, 'BO3', 2),

    ('cd-fastcup-2', '2025-05-01', 'День 1', 1, '20:30', 'Групповой этап · Раунд 1', 3, 'BO1', 1),
    ('cd-fastcup-2', '2025-05-01', 'День 1', 1, '21:45', 'Групповой этап · Раунд 2', 3, 'BO1', 2),
    ('cd-fastcup-2', '2025-05-01', 'День 1', 1, '23:00', 'Групповой этап · Раунд 3', 3, 'BO1', 3),
    ('cd-fastcup-2', '2025-05-01', 'День 1', 1, '00:15', 'Тай-брейк', 1, 'BO1 Turbo / Overthrow', 4),
    ('cd-fastcup-2', '2025-05-02', 'День 2', 2, '20:30', 'Плей-офф · Раунд 1', 2, 'BO3 со счёта 1:0', 1),
    ('cd-fastcup-2', '2025-05-02', 'День 2', 2, '23:00', 'Плей-офф · Раунд 2', 1, 'BO1', 2),
    ('cd-fastcup-2', '2025-05-03', 'День 3', 3, '21:00', 'Гранд-финал', 1, 'BO3', 1),

    ('cd-fastcup-3', '2025-07-11', 'День 1', 1, '21:00', 'Групповой этап · Раунд 1', 2, 'BO2', 1),
    ('cd-fastcup-3', '2025-07-12', 'День 2', 2, '20:00', 'Групповой этап · Раунд 2', 2, 'BO2', 1),
    ('cd-fastcup-3', '2025-07-12', 'День 2', 2, '22:30', 'Групповой этап · Раунд 3', 2, 'BO2', 2),
    ('cd-fastcup-3', '2025-07-13', 'День 3', 3, '20:00', 'Возможный тай-брейк', 1, 'BO1', 1),
    ('cd-fastcup-3', '2025-07-13', 'День 3', 3, '21:15', 'Гранд-финал', 1, 'BO3', 2),

    ('cd-fastcup-4', '2025-10-25', 'День 1', 1, '20:30', 'Групповой этап · Раунд 1', 2, 'BO1', 1),
    ('cd-fastcup-4', '2025-10-25', 'День 1', 1, '21:45', 'Групповой этап · Раунд 2', 2, 'BO1', 2),
    ('cd-fastcup-4', '2025-10-25', 'День 1', 1, '23:00', 'Групповой этап · Раунд 3', 2, 'BO1', 3),
    ('cd-fastcup-4', '2025-10-26', 'День 2', 2, '20:00', 'Плей-офф · Полуфинал', 1, 'BO1', 1),
    ('cd-fastcup-4', '2025-10-26', 'День 2', 2, '21:15', 'Гранд-финал', 1, 'BO3', 2),

    ('cd-fastcup-6', '2026-07-10', 'День 1', 1, '20:00', 'Групповой этап · Раунд 1', 3, 'BO1', 1),
    ('cd-fastcup-6', '2026-07-10', 'День 1', 1, '21:15', 'Групповой этап · Раунд 2', 3, 'BO1', 2),
    ('cd-fastcup-6', '2026-07-10', 'День 1', 1, '22:30', 'Групповой этап · Раунд 3', 3, 'BO1', 3),
    ('cd-fastcup-6', '2026-07-11', 'День 2', 2, '19:00', 'Плей-офф · Верхняя сетка', 1, 'BO1', 1),
    ('cd-fastcup-6', '2026-07-11', 'День 2', 2, '19:00', 'Плей-офф · Нижняя сетка · Раунд 1', 1, 'BO1', 2),
    ('cd-fastcup-6', '2026-07-11', 'День 2', 2, '20:15', 'Плей-офф · Нижняя сетка · Раунд 2', 1, 'BO3', 3),
    ('cd-fastcup-6', '2026-07-12', 'День 3', 3, '20:00', 'Гранд-финал', 1, 'BO3', 1);

INSERT INTO tournament_schedule_days (
    tournament_id, day_date, title, sort_order
)
SELECT DISTINCT
    tournament.id,
    source.day_date,
    source.day_title,
    source.day_order
FROM fastcup_schedule source
JOIN tournaments tournament ON tournament.slug = source.slug
ON CONFLICT (tournament_id, sort_order) DO NOTHING;

INSERT INTO tournament_schedule_entries (
    day_id, start_time, stage_name, match_count, series_format, sort_order
)
SELECT
    schedule_day.id,
    source.start_time,
    source.stage_name,
    source.match_count,
    source.series_format,
    source.entry_order
FROM fastcup_schedule source
JOIN tournaments tournament ON tournament.slug = source.slug
JOIN tournament_schedule_days schedule_day
  ON schedule_day.tournament_id = tournament.id
 AND schedule_day.sort_order = source.day_order
ON CONFLICT (day_id, sort_order) DO NOTHING;

UPDATE tournament_groups tournament_group
SET explanation = 'Итоговые места определялись по числу выигранных карт и правилам тай-брейка турнира.'
FROM tournaments tournament
WHERE tournament_group.tournament_id = tournament.id
  AND tournament.slug IN ('cd-fastcup-2', 'cd-fastcup-3', 'cd-fastcup-6')
  AND tournament_group.name = 'Общая группа';
