CREATE TABLE october_compendium_rune_selection_history (
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    hero_id SMALLINT NOT NULL CHECK (hero_id > 0),
    selected_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (player_id, selected_at)
);
INSERT INTO october_compendium_rune_selection_history
SELECT player_id, hero_id, selected_at FROM october_compendium_rune_challenge_selections;

CREATE FUNCTION preserve_october_rune_selection() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM players WHERE discord_id = OLD.player_id) THEN
        RETURN OLD;
    END IF;
    IF TG_OP <> 'INSERT' THEN
        INSERT INTO october_compendium_rune_selection_history VALUES (OLD.player_id, OLD.hero_id, OLD.selected_at)
        ON CONFLICT DO NOTHING;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        INSERT INTO october_compendium_rune_selection_history VALUES (NEW.player_id, NEW.hero_id, NEW.selected_at)
        ON CONFLICT DO NOTHING;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER preserve_october_rune_selection AFTER INSERT OR UPDATE OR DELETE
ON october_compendium_rune_challenge_selections FOR EACH ROW EXECUTE FUNCTION preserve_october_rune_selection();

CREATE TABLE october_compendium_challenge_days (
    moscow_date DATE PRIMARY KEY CHECK (moscow_date BETWEEN DATE '2026-10-05' AND DATE '2026-10-25'),
    race_definition JSONB
);
ALTER TABLE october_compendium_rune_challenge_completions
    ADD COLUMN completed_manually_by BIGINT,
    ADD COLUMN completion_source TEXT NOT NULL DEFAULT 'automatic' CHECK (completion_source IN ('automatic', 'manual'));
ALTER TABLE october_compendium_clan_outing_completions
    ADD COLUMN completed_manually_by BIGINT,
    ADD COLUMN completion_source TEXT NOT NULL DEFAULT 'automatic' CHECK (completion_source IN ('automatic', 'manual'));
CREATE TABLE october_compendium_manual_completion_audit (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(discord_id),
    moscow_date DATE NOT NULL,
    challenge_kind TEXT NOT NULL,
    completion_id BIGINT NOT NULL,
    administered_by BIGINT,
    match_ids BIGINT[] NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE compendium_star_race_quest_completions
    ADD COLUMN completion_source TEXT NOT NULL DEFAULT 'automatic' CHECK (completion_source IN ('automatic', 'manual'));
ALTER TABLE compendium_user_quest_completions
    DROP CONSTRAINT compendium_user_quest_completion_source_check,
    ADD CONSTRAINT compendium_user_quest_completion_source_check CHECK (
        (completion_source = 'automatic' AND matched_hero_id IS NOT NULL
            AND matched_match_id IS NOT NULL AND completed_manually_by IS NULL)
        OR completion_source = 'manual'
    );
