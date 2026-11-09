type Meeting = {
  opponent_id: number;
  outcome: "win" | "loss" | "draw";
};

export type GroupStandingResult = {
  tournament_id: number;
  group_id: number;
  application_id: number;
  group_name: string;
  team_name: string;
  games: number;
  series_wins: number;
  maps_won: number;
  maps_lost: number;
  meetings: Meeting[];
};

export type GroupStanding = Omit<GroupStandingResult, "meetings"> & {
  id: number;
  place: number;
  place_end: number;
};

const teamNames = new Intl.Collator("ru", { sensitivity: "base" });

function hasMeeting(
  left: GroupStandingResult,
  right: GroupStandingResult,
  accepts: (outcome: Meeting["outcome"]) => boolean,
) {
  if (left === right) return true;
  const meetings = left.meetings.filter(({ opponent_id }) => opponent_id === right.application_id);
  return meetings.length > 0 && meetings.every(({ outcome }) => accepts(outcome));
}

/** Compare tied teams in a mini-table once every pair has a result. */
function rankEqualResults(teams: GroupStandingResult[]) {
  if (teams.length < 2 || !teams.every((left) =>
    teams.every((right) => hasMeeting(left, right, () => true)),
  )) return teams.map((team) => [team]);

  const teamIds = new Set(teams.map(({ application_id }) => application_id));
  const byMeetingWins = Map.groupBy(teams, (team) => team.meetings.filter(
    ({ opponent_id, outcome }) => teamIds.has(opponent_id) && outcome === "win",
  ).length);

  return [...byMeetingWins.entries()].sort(([left], [right]) => right - left)
    .flatMap(([, equalTeams]) => {
      const hasOnlyDraws = equalTeams.every((left) =>
        equalTeams.every((right) => hasMeeting(left, right, (outcome) => outcome === "draw")),
      );
      return hasOnlyDraws
        ? [[...equalTeams].sort((left, right) => teamNames.compare(left.team_name, right.team_name))]
        : equalTeams.map((team) => [team]);
    });
}

/** Resolve each group independently, preserving the original order if a tie has no result yet. */
export function rankGroupStandings(results: GroupStandingResult[]): GroupStanding[] {
  return [...Map.groupBy(results, (team) => team.group_id).values()].flatMap((teams) => {
    const mapDifference = (team: GroupStandingResult) => team.maps_won - team.maps_lost;
    const ordered = [...teams].sort((left, right) =>
      right.series_wins - left.series_wins || mapDifference(right) - mapDifference(left),
    );
    const byResult = Map.groupBy(ordered, (team) => `${team.series_wins}:${mapDifference(team)}`);
    let place = 1;
    return [...byResult.values()].flatMap(rankEqualResults).flatMap((tied) => {
      const firstPlace = place;
      place += tied.length;
      return tied.map((team, index) => ({
        id: firstPlace + index,
        place: firstPlace,
        place_end: place - 1,
        tournament_id: team.tournament_id,
        group_id: team.group_id,
        application_id: team.application_id,
        group_name: team.group_name,
        team_name: team.team_name,
        games: team.games,
        series_wins: team.series_wins,
        maps_won: team.maps_won,
        maps_lost: team.maps_lost,
      }));
    });
  });
}
