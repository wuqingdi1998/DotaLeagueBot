\set ON_ERROR_STOP on

-- Local/CI demonstration data only. Never run this file against production.
BEGIN;

INSERT INTO players (
    discord_id, steam_id32, ingame_name, real_name, positions,
    rank_tier, internal_rating
)
SELECT
    99000 + n,
    199000 + n,
    'Player ' || n,
    'Test player ' || n,
    ((n - 1) % 5 + 1)::text,
    50,
    3000
FROM generate_series(1, 40) AS n
ON CONFLICT (discord_id) DO NOTHING;

INSERT INTO site_admins(discord_id)
VALUES (99001)
ON CONFLICT DO NOTHING;

INSERT INTO tournaments (
    slug, name, eyebrow, headline, headline_accent, description, about,
    start_at, end_at, registration_deadline, status_label, format,
    team_size, max_teams, region, server, check_in_minutes,
    group_format, playoff_format, final_format, discord_url, status
) VALUES (
    'ls-community-cup',
    'LS Community Cup',
    'Первый турнир сезона · Pre-made',
    'Соберите команду.',
    'Войдите в историю.',
    'Первый командный турнир Linken''s Sphere Esports: групповой этап, плей-офф и три вечера хорошей «Доты».',
    'Капитан собирает состав из пяти зарегистрированных игроков. После подтверждения команда попадает в одну из групп.',
    '2026-08-07 18:00:00+03',
    '2026-08-09 23:00:00+03',
    '2026-08-05 23:59:00+03',
    'Регистрация открыта',
    'Pre-made · 5 × 5',
    5,
    8,
    'EU / RU',
    'EU West',
    60,
    'Групповой этап · 2 группы · BO1',
    'Плей-офф · верхняя и нижняя сетка · BO3',
    'Гранд-финал · BO5',
    'https://discord.gg/lsesports',
    'registration'
)
ON CONFLICT (slug) DO NOTHING;

WITH team_data(team_no, team_name, tag, logo_key) AS (
    VALUES
        (1, 'Aurora Stack', 'AUR', '00000000-0000-0000-0000-000000000001.png'),
        (2, 'Blue Roshan', 'BLU', '00000000-0000-0000-0000-000000000002.png'),
        (3, 'Cyber Bears', 'CYB', '00000000-0000-0000-0000-000000000003.png'),
        (4, 'Dire Wolves', 'DWR', '00000000-0000-0000-0000-000000000004.png'),
        (5, 'Frost Guard', 'FRG', '00000000-0000-0000-0000-000000000005.png'),
        (6, 'Neon Lotus', 'NLT', '00000000-0000-0000-0000-000000000006.png'),
        (7, 'Radiant Crew', 'RCR', '00000000-0000-0000-0000-000000000007.png'),
        (8, 'Storm Riders', 'STR', '00000000-0000-0000-0000-000000000008.png')
),
tournament AS (
    SELECT id FROM tournaments WHERE slug = 'ls-community-cup'
)
INSERT INTO tournament_team_applications (
    tournament_id, team_name, tag, captain_discord_id,
    contact, logo_key, status
)
SELECT
    tournament.id,
    team_name,
    tag,
    99000 + (team_no - 1) * 5 + ((team_no - 1) % 5 + 1),
    '@test_captain_' || team_no,
    logo_key,
    'approved'
FROM team_data
CROSS JOIN tournament
ON CONFLICT (tournament_id, team_name) DO NOTHING;

WITH roles(position, role) AS (
    VALUES
        (1, 'safe_lane'),
        (2, 'mid_lane'),
        (3, 'off_lane'),
        (4, 'soft_support'),
        (5, 'hard_support')
),
applications AS (
    SELECT
        application.id,
        ROW_NUMBER() OVER (ORDER BY application.id)::int AS team_no
    FROM tournament_team_applications application
    JOIN tournaments tournament ON tournament.id = application.tournament_id
    WHERE tournament.slug = 'ls-community-cup'
)
INSERT INTO tournament_team_members (
    application_id, player_id, role, is_captain,
    invitation_status, responded_at
)
SELECT
    applications.id,
    99000 + (applications.team_no - 1) * 5 + roles.position,
    roles.role,
    roles.position = ((applications.team_no - 1) % 5 + 1),
    'accepted',
    NOW()
FROM applications
CROSS JOIN roles
ON CONFLICT (application_id, player_id) DO NOTHING;

INSERT INTO tournament_groups(tournament_id, name, sort_order)
SELECT id, 'Группа А', 1
FROM tournaments
WHERE slug = 'ls-community-cup'
ON CONFLICT (tournament_id, name) DO NOTHING;

INSERT INTO tournament_groups(tournament_id, name, sort_order)
SELECT id, 'Группа Б', 2
FROM tournaments
WHERE slug = 'ls-community-cup'
ON CONFLICT (tournament_id, name) DO NOTHING;

WITH ranked AS (
    SELECT
        application.id,
        ROW_NUMBER() OVER (ORDER BY application.id)::int AS team_number,
        application.tournament_id
    FROM tournament_team_applications application
    JOIN tournaments tournament ON tournament.id = application.tournament_id
    WHERE tournament.slug = 'ls-community-cup'
)
INSERT INTO tournament_group_teams(group_id, application_id, sort_order)
SELECT
    tournament_group.id,
    ranked.id,
    ((ranked.team_number - 1) / 2)::int
FROM ranked
JOIN tournament_groups tournament_group
    ON tournament_group.tournament_id = ranked.tournament_id
    AND tournament_group.name = CASE
        WHEN ranked.team_number IN (1, 4, 5, 8) THEN 'Группа А'
        ELSE 'Группа Б'
    END
ON CONFLICT (group_id, application_id) DO NOTHING;

WITH tournament AS (
    SELECT id FROM tournaments WHERE slug = 'ls-community-cup'
),
applications AS (
    SELECT id, tag
    FROM tournament_team_applications
    WHERE tournament_id = (SELECT id FROM tournament)
),
groups AS (
    SELECT id, name
    FROM tournament_groups
    WHERE tournament_id = (SELECT id FROM tournament)
)
INSERT INTO tournament_matches (
    tournament_id, group_id, scheduled_at, stage,
    team_a_application_id, team_b_application_id, best_of, sort_order
)
SELECT
    tournament.id,
    (SELECT id FROM groups WHERE name = 'Группа А'),
    TIMESTAMPTZ '2026-08-07 18:00:00+03',
    'Групповой этап',
    (SELECT id FROM applications WHERE tag = 'AUR'),
    (SELECT id FROM applications WHERE tag = 'DWR'),
    1,
    1
FROM tournament
WHERE NOT EXISTS (
    SELECT 1 FROM tournament_matches WHERE tournament_id = tournament.id
)
UNION ALL
SELECT
    tournament.id,
    (SELECT id FROM groups WHERE name = 'Группа Б'),
    TIMESTAMPTZ '2026-08-07 19:30:00+03',
    'Групповой этап',
    (SELECT id FROM applications WHERE tag = 'BLU'),
    (SELECT id FROM applications WHERE tag = 'CYB'),
    1,
    2
FROM tournament
WHERE NOT EXISTS (
    SELECT 1 FROM tournament_matches WHERE tournament_id = tournament.id
)
UNION ALL
SELECT
    tournament.id,
    (SELECT id FROM groups WHERE name = 'Группа А'),
    TIMESTAMPTZ '2026-08-07 21:00:00+03',
    'Групповой этап',
    (SELECT id FROM applications WHERE tag = 'FRG'),
    (SELECT id FROM applications WHERE tag = 'STR'),
    1,
    3
FROM tournament
WHERE NOT EXISTS (
    SELECT 1 FROM tournament_matches WHERE tournament_id = tournament.id
)
UNION ALL
SELECT
    tournament.id,
    (SELECT id FROM groups WHERE name = 'Группа Б'),
    TIMESTAMPTZ '2026-08-07 22:30:00+03',
    'Групповой этап',
    (SELECT id FROM applications WHERE tag = 'NLT'),
    (SELECT id FROM applications WHERE tag = 'RCR'),
    1,
    4
FROM tournament
WHERE NOT EXISTS (
    SELECT 1 FROM tournament_matches WHERE tournament_id = tournament.id
);

COMMIT;
