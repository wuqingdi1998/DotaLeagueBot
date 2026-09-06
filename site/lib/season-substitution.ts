type SubstitutionGame = {
  game_number: number;
  status: string;
  winner_side: string | null;
  dota_match_id: string | null;
};

export function canSubstituteOnSecondMap(games: SubstitutionGame[]): boolean {
  return games.some((game) =>
    game.status === "completed" &&
    (game.game_number === 2 ||
      (game.game_number === 1 && Boolean(game.dota_match_id) &&
        (game.winner_side === "a" || game.winner_side === "b"))),
  );
}
