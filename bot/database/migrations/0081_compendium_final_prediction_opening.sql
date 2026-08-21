ALTER TABLE compendium_star_race_final_predictions
    ADD COLUMN opened_at TIMESTAMPTZ;

UPDATE compendium_star_race_final_predictions
SET opened_at = created_at
WHERE opened_at IS NULL;

ALTER TABLE compendium_star_race_final_predictions
    ALTER COLUMN opened_at SET DEFAULT NOW(),
    ALTER COLUMN opened_at SET NOT NULL;
