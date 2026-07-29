export type TournamentSettings = {
  id: number;
  start_at: Date;
  end_at: Date;
  group_format: string;
  playoff_format: string;
  final_format: string;
  playoff_type: "single_elimination" | "double_elimination";
};

export type GroupRow = {
  id: number;
  name: string;
  capacity: number;
  sort_order: number;
  advance_to_playoff: number;
};
