CREATE OR REPLACE FUNCTION october_clan_player_is_eligible(target_player_id BIGINT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM players player
        WHERE player.discord_id = target_player_id
          AND player.is_archived = FALSE
          AND player.tier_status <> 'inactive'
          AND NOT EXISTS (
              SELECT 1 FROM player_discord_roles role
              WHERE role.player_id = player.discord_id
                AND LOWER(BTRIM(role.role_name)) = LOWER('Массовка')
          )
    );
$$;

-- Keep removed membership snapshots so the cleanup remains traceable and recoverable.
CREATE TABLE october_compendium_removed_clan_members (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL,
    membership JSONB NOT NULL,
    removed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION remove_ineligible_october_clan_players(
    excluded_player_ids BIGINT[] DEFAULT ARRAY[]::BIGINT[]
)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    removed_count INTEGER;
BEGIN
    WITH removed AS (
        DELETE FROM october_compendium_clan_members member
        WHERE NOT october_clan_player_is_eligible(member.player_id)
           OR member.player_id = ANY(excluded_player_ids)
        RETURNING member.*
    )
    INSERT INTO october_compendium_removed_clan_members (player_id, membership)
    SELECT removed.player_id, to_jsonb(removed) FROM removed;
    GET DIAGNOSTICS removed_count = ROW_COUNT;

    DELETE FROM october_compendium_clan_reservations reservation
    WHERE NOT october_clan_player_is_eligible(reservation.player_id)
       OR reservation.player_id = ANY(excluded_player_ids);
    DELETE FROM october_compendium_clan_assignment_drafts draft
    WHERE NOT october_clan_player_is_eligible(draft.player_id)
       OR draft.player_id = ANY(excluded_player_ids);
    RETURN removed_count;
END;
$$;

CREATE OR REPLACE FUNCTION guard_october_clan_eligibility()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NOT october_clan_player_is_eligible(NEW.player_id) THEN
        RETURN NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER october_clan_member_eligibility
BEFORE INSERT OR UPDATE ON october_compendium_clan_members
FOR EACH ROW EXECUTE FUNCTION guard_october_clan_eligibility();
CREATE TRIGGER october_clan_reservation_eligibility
BEFORE INSERT OR UPDATE ON october_compendium_clan_reservations
FOR EACH ROW EXECUTE FUNCTION guard_october_clan_eligibility();
CREATE TRIGGER october_clan_draft_eligibility
BEFORE INSERT OR UPDATE ON october_compendium_clan_assignment_drafts
FOR EACH ROW EXECUTE FUNCTION guard_october_clan_eligibility();

CREATE OR REPLACE FUNCTION remove_changed_ineligible_october_clan_player()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM remove_ineligible_october_clan_players();
    RETURN NEW;
END;
$$;

CREATE TRIGGER october_clan_player_status_cleanup
AFTER UPDATE OF tier_status, is_archived ON players
FOR EACH STATEMENT EXECUTE FUNCTION remove_changed_ineligible_october_clan_player();
CREATE TRIGGER october_clan_excluded_role_cleanup
AFTER INSERT OR UPDATE ON player_discord_roles
FOR EACH STATEMENT EXECUTE FUNCTION remove_changed_ineligible_october_clan_player();

SELECT remove_ineligible_october_clan_players();
