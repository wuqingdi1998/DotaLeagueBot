
    CREATE TABLE players (discord_id bigint PRIMARY KEY, ingame_name text, steam_id32 bigint,
      avatar_url text, is_archived boolean DEFAULT false);
    INSERT INTO players VALUES (100, 'Sanraizu', 149981874, NULL, false),
      (200, 'Archive only', 200, NULL, false), (300, 'Departed', 300, NULL, false);
    CREATE TABLE web_sessions (discord_id bigint, discord_avatar_url text, created_at timestamptz);
    CREATE TABLE compendium_daily_quest_sets (id bigint, moscow_date date);
    INSERT INTO compendium_daily_quest_sets VALUES (1, '2026-08-11'), (2, '2026-10-06');
    CREATE TABLE compendium_daily_quests (id bigint, quest_set_id bigint, position smallint, player_id bigint);
    INSERT INTO compendium_daily_quests VALUES (1, 1, 1, 100), (2, 2, 1, 100);
    CREATE TABLE compendium_daily_quest_heroes (daily_quest_id bigint, hero_id smallint, position smallint);
    INSERT INTO compendium_daily_quest_heroes VALUES (1, 2, 1), (2, 7, 1);
    CREATE TABLE compendium_user_quest_completions (id bigint, player_id bigint, daily_quest_id bigint,
      reward_amount smallint, completed_at timestamptz, matched_hero_id smallint,
      matched_match_id bigint, completed_manually_by bigint);
    INSERT INTO compendium_user_quest_completions VALUES
      (1, 100, 1, 7, '2026-08-11 12:00+03', 2, 10, NULL),
      (2, 100, 2, 1, '2026-10-06 12:00+03', 7, 20, NULL),
      (3, 200, 1, 9, '2026-08-11 12:00+03', 2, 30, NULL),
      (4, 100, 1, 50, '2026-10-06 12:00+03', 2, 40, NULL),
      (5, 300, 2, 99, '2026-10-06 12:00+03', 7, 50, NULL);
    CREATE TABLE compendium_user_quest_rerolls (id bigint, daily_quest_id bigint, player_id bigint, used_at timestamptz);
    CREATE TABLE compendium_user_quest_reroll_heroes (reroll_id bigint, hero_id smallint, position smallint);
    CREATE TABLE compendium_admin_star_adjustments (id bigint, player_id bigint, amount int,
      created_at timestamptz, administrator_name text, is_star_race_eligible boolean);
    INSERT INTO compendium_admin_star_adjustments VALUES
      (1, 100, 3, '2026-08-17 12:00+03', 'Admin', true),
      (2, 100, 2, '2026-10-05 00:00+03', 'Admin', true),
      (3, 100, 100, '2026-10-26 00:00+03', 'Admin', true);
    CREATE TABLE compendium_prediction_matches (id bigint, moscow_date date, team_a_name text,
      team_b_name text, actual_score text);
    INSERT INTO compendium_prediction_matches VALUES (1, '2026-08-13', 'A', 'B', '2:0'),
      (2, '2026-10-06', 'C', 'D', '2:0');
    CREATE TABLE compendium_prediction_rewards (match_id bigint, player_id bigint, reward_amount smallint, awarded_at timestamptz);
    INSERT INTO compendium_prediction_rewards VALUES
      (1, 100, 50, '2026-10-06 12:00+03'), (2, 100, 1, '2026-10-06 12:00+03');
    CREATE TABLE compendium_prediction_picks (match_id bigint, player_id bigint, predicted_score text);
    INSERT INTO compendium_prediction_picks VALUES (1, 100, '2:0'), (2, 100, '2:0');
    CREATE TABLE compendium_rune_challenge_completions (id bigint, player_id bigint, reward_amount smallint,
      completed_at timestamptz, moscow_date date, hero_id smallint, matched_match_id bigint);
    INSERT INTO compendium_rune_challenge_completions VALUES
      (1, 100, 90, '2026-08-13 12:00+03', '2026-08-13', 16, 60);
    CREATE TABLE october_compendium_rune_challenge_completions (LIKE compendium_rune_challenge_completions);
    INSERT INTO october_compendium_rune_challenge_completions VALUES
      (1, 100, 1, '2026-10-06 18:42+03', '2026-10-06', 93, 9032115369);
    CREATE TABLE compendium_star_race_quest_completions (id bigint, player_id bigint, reward_amount smallint,
      completed_at timestamptz, moscow_date date, completed_manually_by bigint);
    INSERT INTO compendium_star_race_quest_completions VALUES
      (1, 100, 50, '2026-08-17 12:00+03', '2026-08-17', NULL),
      (2, 100, 2, '2026-10-06 12:00+03', '2026-10-06', NULL);
    CREATE TABLE compendium_star_race_quest_wins (completion_id bigint, position smallint,
      hero_id smallint, matched_match_id bigint);
    CREATE TABLE compendium_star_race_standings_snapshots (race_start_at timestamptz PRIMARY KEY, participants jsonb);
    CREATE TABLE october_compendium_clan_outing_completions (id bigint, player_id bigint, reward_amount smallint,
      completed_at timestamptz, moscow_date date, matched_match_id bigint, partner_player_id bigint);
    INSERT INTO october_compendium_clan_outing_completions VALUES
      (1, 100, 2, '2026-10-06 12:00+03', '2026-10-06', 70, 200);
    CREATE TABLE october_compendium_server_membership (player_id bigint, is_present boolean, stars_reset_at timestamptz);
    INSERT INTO october_compendium_server_membership VALUES (300, false, '2026-10-06');
    CREATE TABLE october_compendium_clan_activity (player_id bigint, previous_compendium_stars int,
      ranked_matches_last_three_months int, matches_last_three_months int, internal_rating int, rank_tier int);
    INSERT INTO october_compendium_clan_activity VALUES (100, 100, 10, 20, 3000, 40);
    CREATE TABLE october_compendium_clan_assignment_drafts (player_id bigint, activity_score numeric,
      assignment_source text, decision_reason text);
    INSERT INTO october_compendium_clan_assignment_drafts VALUES (100, 432, 'automatic', 'Old score');
    CREATE TABLE october_compendium_clan_members (player_id bigint, total_points int, activity_score numeric);
    INSERT INTO october_compendium_clan_members VALUES (100, 9, 432), (200, 0, 0);
  