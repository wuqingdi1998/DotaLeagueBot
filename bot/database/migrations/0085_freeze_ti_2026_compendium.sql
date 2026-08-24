CREATE OR REPLACE FUNCTION prevent_finished_ti_2026_compendium_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'TI 2026 Compendium is finished and permanently read-only'
        USING ERRCODE = '55000';
END;
$$;

DO $$
DECLARE
    frozen_table text;
BEGIN
    FOREACH frozen_table IN ARRAY ARRAY[
        'compendium_daily_quest_sets',
        'compendium_daily_quests',
        'compendium_daily_quest_heroes',
        'compendium_user_quest_completions',
        'compendium_check_rate_limits',
        'compendium_user_quest_rerolls',
        'compendium_user_quest_reroll_heroes',
        'compendium_prediction_days',
        'compendium_prediction_matches',
        'compendium_prediction_picks',
        'compendium_prediction_rewards',
        'compendium_rune_challenge_selections',
        'compendium_rune_challenge_completions',
        'compendium_admin_star_adjustments',
        'compendium_star_race_quest_completions',
        'compendium_star_race_quest_wins',
        'compendium_star_race_quest_progress',
        'compendium_star_race_quest_progress_wins',
        'compendium_star_race_tiebreak_rolls',
        'compendium_star_race_standings_snapshots',
        'compendium_star_race_final_predictions',
        'compendium_star_race_final_prediction_picks',
        'compendium_star_race_arcana_checks',
        'compendium_arcana_replay_results'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS freeze_ti_2026_compendium ON %I',
            frozen_table
        );
        EXECUTE format(
            'CREATE TRIGGER freeze_ti_2026_compendium '
            'BEFORE INSERT OR UPDATE OR DELETE ON %I '
            'FOR EACH STATEMENT EXECUTE FUNCTION '
            'prevent_finished_ti_2026_compendium_mutation()',
            frozen_table
        );
    END LOOP;
END;
$$;
