CREATE OR REPLACE FUNCTION allow_october_star_race_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    old_event_date date;
    new_event_date date;
BEGIN
    IF TG_TABLE_NAME IN (
        'compendium_star_race_quest_completions',
        'compendium_star_race_quest_progress',
        'compendium_star_race_quest_progress_wins',
        'compendium_star_race_arcana_checks'
    ) THEN
        IF TG_OP <> 'INSERT' THEN
            old_event_date := OLD.moscow_date;
        END IF;
        IF TG_OP <> 'DELETE' THEN
            new_event_date := NEW.moscow_date;
        END IF;
    ELSIF TG_TABLE_NAME = 'compendium_star_race_quest_wins' THEN
        IF TG_OP <> 'INSERT' THEN
            SELECT moscow_date INTO old_event_date
            FROM compendium_star_race_quest_completions
            WHERE id = OLD.completion_id;
        END IF;
        IF TG_OP <> 'DELETE' THEN
            SELECT moscow_date INTO new_event_date
            FROM compendium_star_race_quest_completions
            WHERE id = NEW.completion_id;
        END IF;
    ELSIF TG_TABLE_NAME IN (
        'compendium_star_race_tiebreak_rolls',
        'compendium_star_race_standings_snapshots'
    ) THEN
        IF TG_OP <> 'INSERT' THEN
            old_event_date := (OLD.race_start_at AT TIME ZONE 'Europe/Moscow')::date;
        END IF;
        IF TG_OP <> 'DELETE' THEN
            new_event_date := (NEW.race_start_at AT TIME ZONE 'Europe/Moscow')::date;
        END IF;
    END IF;

    IF (old_event_date IS NULL OR old_event_date BETWEEN DATE '2026-10-05' AND DATE '2026-10-25')
       AND (new_event_date IS NULL OR new_event_date BETWEEN DATE '2026-10-05' AND DATE '2026-10-25')
       AND (old_event_date IS NOT NULL OR new_event_date IS NOT NULL) THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION
        'TI 2026 Compendium is finished and permanently read-only'
        USING ERRCODE = '55000';
END;
$$;

DO $$
DECLARE
    october_table text;
BEGIN
    FOREACH october_table IN ARRAY ARRAY[
        'compendium_star_race_quest_completions',
        'compendium_star_race_quest_wins',
        'compendium_star_race_quest_progress',
        'compendium_star_race_quest_progress_wins',
        'compendium_star_race_tiebreak_rolls',
        'compendium_star_race_standings_snapshots',
        'compendium_star_race_arcana_checks'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS freeze_ti_2026_compendium ON %I',
            october_table
        );
        EXECUTE format(
            'CREATE TRIGGER freeze_ti_2026_compendium '
            'BEFORE INSERT OR UPDATE OR DELETE ON %I '
            'FOR EACH ROW EXECUTE FUNCTION allow_october_star_race_mutation()',
            october_table
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION apply_october_star_race_clan_points()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP <> 'INSERT'
       AND OLD.moscow_date BETWEEN DATE '2026-10-05' AND DATE '2026-10-25' THEN
        UPDATE october_compendium_clan_members
        SET total_points = GREATEST(0, total_points - OLD.reward_amount)
        WHERE player_id = OLD.player_id;
    END IF;

    IF TG_OP <> 'DELETE'
       AND NEW.moscow_date BETWEEN DATE '2026-10-05' AND DATE '2026-10-25' THEN
        UPDATE october_compendium_clan_members
        SET total_points = total_points + NEW.reward_amount
        WHERE player_id = NEW.player_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS october_star_race_clan_points
    ON compendium_star_race_quest_completions;
CREATE TRIGGER october_star_race_clan_points
AFTER INSERT OR UPDATE OR DELETE
ON compendium_star_race_quest_completions
FOR EACH ROW
EXECUTE FUNCTION apply_october_star_race_clan_points();
