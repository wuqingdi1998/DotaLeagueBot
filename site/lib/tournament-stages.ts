export type TournamentCompetitionStage = {
  key: "groups" | "playoffs" | "final";
  label: string;
  description: string;
};

export function tournamentCompetitionStages(tournament: {
  group_format: string;
  playoff_format: string;
  final_format: string;
}): TournamentCompetitionStage[] {
  const stages: TournamentCompetitionStage[] = [
    {
      key: "groups",
      label: "Групповой этап",
      description: tournament.group_format,
    },
  ];
  if (tournament.playoff_format.trim()) {
    stages.push({
      key: "playoffs",
      label: "Плей-офф",
      description: tournament.playoff_format,
    });
  }
  stages.push({
    key: "final",
    label: "Гранд-финал",
    description: tournament.final_format,
  });
  return stages;
}
