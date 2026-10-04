CREATE OR REPLACE FUNCTION allow_october_daily_compendium_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    old_event_date date;
    new_event_date date;
    participant_id bigint;
BEGIN
    IF TG_TABLE_NAME = 'compendium_daily_quest_sets' THEN
        IF TG_OP <> 'INSERT' THEN
            old_event_date := OLD.moscow_date;
        END IF;
        IF TG_OP <> 'DELETE' THEN
            new_event_date := NEW.moscow_date;
        END IF;
    ELSIF TG_TABLE_NAME IN (
        'compendium_daily_quests',
        'compendium_daily_quest_heroes',
        'compendium_user_quest_rerolls'
    ) THEN
        IF TG_OP <> 'INSERT' THEN
            SELECT moscow_date INTO old_event_date
            FROM compendium_daily_quest_sets
            WHERE id = OLD.quest_set_id;
        END IF;
        IF TG_OP <> 'DELETE' THEN
            SELECT moscow_date INTO new_event_date
            FROM compendium_daily_quest_sets
            WHERE id = NEW.quest_set_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'compendium_user_quest_completions' THEN
        IF TG_OP <> 'INSERT' THEN
            SELECT quest_set.moscow_date INTO old_event_date
            FROM compendium_daily_quests quest
            JOIN compendium_daily_quest_sets quest_set ON quest_set.id = quest.quest_set_id
            WHERE quest.id = OLD.daily_quest_id;
        END IF;
        IF TG_OP <> 'DELETE' THEN
            SELECT quest_set.moscow_date INTO new_event_date
            FROM compendium_daily_quests quest
            JOIN compendium_daily_quest_sets quest_set ON quest_set.id = quest.quest_set_id
            WHERE quest.id = NEW.daily_quest_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'compendium_user_quest_reroll_heroes' THEN
        IF TG_OP <> 'INSERT' THEN
            SELECT quest_set.moscow_date INTO old_event_date
            FROM compendium_user_quest_rerolls reroll
            JOIN compendium_daily_quest_sets quest_set ON quest_set.id = reroll.quest_set_id
            WHERE reroll.id = OLD.reroll_id;
        END IF;
        IF TG_OP <> 'DELETE' THEN
            SELECT quest_set.moscow_date INTO new_event_date
            FROM compendium_user_quest_rerolls reroll
            JOIN compendium_daily_quest_sets quest_set ON quest_set.id = reroll.quest_set_id
            WHERE reroll.id = NEW.reroll_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'compendium_check_rate_limits' THEN
        participant_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.player_id ELSE NEW.player_id END;
        IF EXISTS (
            SELECT 1 FROM october_compendium_clan_members
            WHERE player_id = participant_id
        ) THEN
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            END IF;
            RETURN NEW;
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
        'compendium_daily_quest_sets',
        'compendium_daily_quests',
        'compendium_daily_quest_heroes',
        'compendium_user_quest_completions',
        'compendium_check_rate_limits',
        'compendium_user_quest_rerolls',
        'compendium_user_quest_reroll_heroes'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS freeze_ti_2026_compendium ON %I',
            october_table
        );
        EXECUTE format(
            'CREATE TRIGGER freeze_ti_2026_compendium '
            'BEFORE INSERT OR UPDATE OR DELETE ON %I '
            'FOR EACH ROW EXECUTE FUNCTION allow_october_daily_compendium_mutation()',
            october_table
        );
    END LOOP;
END;
$$;
