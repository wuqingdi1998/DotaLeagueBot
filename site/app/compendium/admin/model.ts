import { compendiumHeroById } from "../model/heroes";
import { moscowDateLabel } from "../model/time";
import type {
  CompendiumAdminParticipant,
  CompendiumAdminSourceRow,
  CompendiumRewardHistory,
} from "./types";

export function buildCompendiumAdminParticipants(
  rows: CompendiumAdminSourceRow[],
): CompendiumAdminParticipant[] {
  const participants = new Map<string, CompendiumAdminParticipant>();
  const rewardsByParticipant = new Map<
    string,
    Map<string, CompendiumRewardHistory>
  >();

  for (const row of rows) {
    const participant = participants.get(row.player_id) ?? {
      discordId: row.player_id,
      dotaId: row.dota_id,
      playerName: row.player_name,
      avatarUrl: row.avatar_url,
      totalStars: row.total_stars,
      rewards: [],
    };
    participants.set(row.player_id, participant);

    if (
      !row.completion_id ||
      !row.moscow_date ||
      !row.completed_at ||
      row.reward_amount === null
    ) {
      continue;
    }

    const participantRewards = rewardsByParticipant.get(row.player_id) ?? new Map();
    rewardsByParticipant.set(row.player_id, participantRewards);
    const historyId = `${row.history_kind}:${row.completion_id}`;
    if (
      row.history_kind === "rune" &&
      row.matched_hero_id !== null &&
      row.matched_match_id
    ) {
      if (!participantRewards.has(historyId)) {
        const reward: CompendiumRewardHistory = {
          kind: "rune",
          id: historyId,
          dateKey: row.moscow_date,
          dateLabel: moscowDateLabel(row.moscow_date),
          completedAt: row.completed_at.toISOString(),
          rewardAmount: row.reward_amount,
          hero: compendiumHeroById(row.matched_hero_id),
          matchedMatchId: row.matched_match_id,
        };
        participant.rewards.push(reward);
        participantRewards.set(historyId, reward);
      }
      continue;
    }
    if (
      row.history_kind === "prediction" &&
      row.team_a_name &&
      row.team_b_name &&
      row.predicted_score &&
      row.actual_score
    ) {
      if (!participantRewards.has(historyId)) {
        const reward: CompendiumRewardHistory = {
          kind: "prediction",
          id: historyId,
          dateKey: row.moscow_date,
          dateLabel: moscowDateLabel(row.moscow_date),
          completedAt: row.completed_at.toISOString(),
          rewardAmount: row.reward_amount,
          teamAName: row.team_a_name,
          teamBName: row.team_b_name,
          predictedScore: row.predicted_score,
          actualScore: row.actual_score,
        };
        participant.rewards.push(reward);
        participantRewards.set(historyId, reward);
      }
      continue;
    }
    if (row.history_kind === "admin") {
      if (!participantRewards.has(historyId)) {
        const reward: CompendiumRewardHistory = {
          kind: "admin",
          id: historyId,
          dateKey: row.moscow_date,
          dateLabel: moscowDateLabel(row.moscow_date),
          completedAt: row.completed_at.toISOString(),
          rewardAmount: row.reward_amount,
          administratorName: row.administrator_name ?? "Администратор",
        };
        participant.rewards.push(reward);
        participantRewards.set(historyId, reward);
      }
      continue;
    }
    if (
      row.history_kind !== "quest" ||
      row.quest_position === null ||
      row.matched_hero_id === null ||
      !row.matched_match_id
    ) {
      continue;
    }
    const existingReward = participantRewards.get(historyId);
    const reward = existingReward?.kind === "quest" ? existingReward : {
      kind: "quest" as const,
      id: historyId,
      dateKey: row.moscow_date,
      dateLabel: moscowDateLabel(row.moscow_date),
      questPosition: row.quest_position,
      matchedHeroId: row.matched_hero_id,
      matchedMatchId: row.matched_match_id,
      completedAt: row.completed_at.toISOString(),
      rewardAmount: row.reward_amount,
      heroes: [],
    };

    if (row.quest_hero_id !== null) {
      reward.heroes.push(compendiumHeroById(row.quest_hero_id));
    }
    if (!participantRewards.has(historyId)) {
      participant.rewards.push(reward);
      participantRewards.set(historyId, reward);
    }
  }

  for (const participant of participants.values()) {
    participant.rewards.sort(
      (left, right) =>
        right.completedAt.localeCompare(left.completedAt) ||
        right.id.localeCompare(left.id),
    );
  }

  return [...participants.values()].sort(
    (left, right) =>
      right.totalStars - left.totalStars ||
      left.playerName.localeCompare(right.playerName, "ru"),
  );
}
