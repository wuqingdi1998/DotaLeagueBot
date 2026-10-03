DELETE FROM october_compendium_clan_members member
USING player_discord_roles role
WHERE role.player_id = member.player_id
  AND role.role_name = 'Массовка';

DELETE FROM october_compendium_clan_reservations reservation
USING player_discord_roles role
WHERE role.player_id = reservation.player_id
  AND role.role_name = 'Массовка';

DELETE FROM october_compendium_clan_assignment_drafts draft
USING player_discord_roles role
WHERE role.player_id = draft.player_id
  AND role.role_name = 'Массовка';

DELETE FROM october_compendium_clan_activity activity
USING player_discord_roles role
WHERE role.player_id = activity.player_id
  AND role.role_name = 'Массовка';
