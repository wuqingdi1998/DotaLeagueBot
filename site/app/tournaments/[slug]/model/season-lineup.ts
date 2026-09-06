import type { SeasonMatch, SeasonMatchParticipant } from "./season-types";

export type SeasonLineupPlayer = SeasonMatchParticipant & {
  isFormerPlayer: boolean;
  mapLabel: string | null;
};

export function seasonTeamLineup(match: SeasonMatch, teamSide: "a" | "b"): SeasonLineupPlayer[] {
  return match.participants.filter((player) => player.team_side === teamSide).flatMap((player) => {
    const substitution = match.substitutions.find((item) => item.outgoing_player_id === player.player_id);
    const original = { ...player, isFormerPlayer: false, mapLabel: null };
    if (!substitution) return [original];
    const replacement: SeasonLineupPlayer = {
      ...player,
      player_id: substitution.incoming_player_id,
      dota_id: substitution.incoming_dota_id,
      nickname: substitution.incoming_nickname,
      avatar_url: substitution.incoming_avatar_url,
      tier_snapshot: substitution.incoming_tier ?? null,
      is_captain: substitution.incoming_is_captain ?? player.is_captain,
      is_host: match.host_player_id === substitution.incoming_player_id,
      isFormerPlayer: false,
      mapLabel: substitution.game_number === 2 ? "(2-я карта)" : null,
    };
    if (substitution.game_number === null) return [replacement];
    return [{ ...original, isFormerPlayer: true, mapLabel: "(1-я карта)" }, replacement];
  });
}
