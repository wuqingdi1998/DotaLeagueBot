-- Updating match evidence or its retry time must never change an earned reward.
CREATE OR REPLACE FUNCTION apply_october_star_race_clan_points()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.player_id = OLD.player_id
       AND NEW.moscow_date = OLD.moscow_date AND NEW.reward_amount = OLD.reward_amount THEN
        RETURN NEW;
    END IF;
    IF TG_OP <> 'INSERT'
       AND OLD.moscow_date BETWEEN DATE '2026-10-05' AND DATE '2026-10-25' THEN
        UPDATE october_compendium_clan_members
        SET total_points = GREATEST(0, total_points - OLD.reward_amount)
        WHERE player_id = OLD.player_id;
    END IF;
    IF TG_OP <> 'DELETE'
       AND NEW.moscow_date BETWEEN DATE '2026-10-05' AND DATE '2026-10-25' THEN
        UPDATE october_compendium_clan_members SET total_points = total_points + NEW.reward_amount
        WHERE player_id = NEW.player_id;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
