CREATE FUNCTION grant_october_2026_profile_badges(target_player_id BIGINT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('october-profile-badge:' || target_player_id::text));
    INSERT INTO player_profile_badges(player_id, badge_key, source_event)
    SELECT member.player_id, 'october-2026-' || member.clan_id || '-' || level.tier,
           'october-2026-compendium'
    FROM october_compendium_clan_members member
    JOIN compendium_player_star_totals total ON total.player_id = member.player_id
    CROSS JOIN (VALUES ('bronze', 10), ('silver', 40), ('gold', 80), ('platinum', 120)) level(tier, stars)
    WHERE member.player_id = target_player_id AND total.total_stars >= level.stars
    ON CONFLICT (player_id, badge_key) DO NOTHING;
END;
$$;

CREATE FUNCTION grant_october_2026_profile_badges_after_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM grant_october_2026_profile_badges(NEW.player_id);
    RETURN NEW;
END;
$$;

-- Every star source uses the same live total, including manual awards and league adjustments.
CREATE TRIGGER zz_october_daily_profile_badges AFTER INSERT OR UPDATE OF reward_amount
ON compendium_user_quest_completions FOR EACH ROW EXECUTE FUNCTION grant_october_2026_profile_badges_after_change();
CREATE TRIGGER zz_october_adjustment_profile_badges AFTER INSERT OR UPDATE OF amount
ON compendium_admin_star_adjustments FOR EACH ROW EXECUTE FUNCTION grant_october_2026_profile_badges_after_change();
CREATE TRIGGER zz_october_prediction_profile_badges AFTER INSERT OR UPDATE OF reward_amount
ON compendium_prediction_rewards FOR EACH ROW EXECUTE FUNCTION grant_october_2026_profile_badges_after_change();
CREATE TRIGGER zz_october_rune_profile_badges AFTER INSERT OR UPDATE OF reward_amount
ON october_compendium_rune_challenge_completions FOR EACH ROW EXECUTE FUNCTION grant_october_2026_profile_badges_after_change();
CREATE TRIGGER zz_october_race_profile_badges AFTER INSERT OR UPDATE OF reward_amount
ON compendium_star_race_quest_completions FOR EACH ROW EXECUTE FUNCTION grant_october_2026_profile_badges_after_change();
CREATE TRIGGER zz_october_outing_profile_badges AFTER INSERT OR UPDATE OF reward_amount
ON october_compendium_clan_outing_completions FOR EACH ROW EXECUTE FUNCTION grant_october_2026_profile_badges_after_change();
CREATE TRIGGER zz_october_member_profile_badges AFTER INSERT OR UPDATE OF clan_id
ON october_compendium_clan_members FOR EACH ROW EXECUTE FUNCTION grant_october_2026_profile_badges_after_change();

SELECT grant_october_2026_profile_badges(player_id) FROM october_compendium_clan_members ORDER BY player_id;
