export type Rule = {
  id: number;
  rule_text: string;
};

export type Prize = {
  id: number;
  placement: number;
  application_id: number | null;
  team_name: string | null;
  prize_text: string | null;
};

export type Application = {
  id: number;
  team_name: string;
};

export type ScheduleDay = {
  id: number;
  day_date: string;
  title: string | null;
  entries: Array<{
    id: number;
    start_time: string;
    stage_name: string;
    match_count: number;
    series_format: string;
  }>;
};

export type RuleDraft = {
  key: string;
  text: string;
};

export type PrizeDraft = {
  key: string;
  placement: number;
  applicationId: number | null;
  teamName: string;
  prizeText: string;
};

export type ScheduleEntryDraft = {
  key: string;
  startTime: string;
  stageName: string;
  matchCount: number;
  seriesFormat: string;
};

export type ScheduleDayDraft = {
  key: string;
  dayDate: string;
  title: string;
  entries: ScheduleEntryDraft[];
};
