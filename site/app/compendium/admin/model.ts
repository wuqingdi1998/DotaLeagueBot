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
      row.quest_position === null ||
      row.matched_hero_id === null ||
      !row.matched_match_id ||
      !row.completed_at ||
      row.reward_amount === null
    ) {
      continue;
    }

    const participantRewards = rewardsByParticipant.get(row.player_id) ?? new Map();
    rewardsByParticipant.set(row.player_id, participantRewards);
    const reward = participantRewards.get(row.completion_id) ?? {
      id: row.completion_id,
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
    if (!participantRewards.has(row.completion_id)) {
      participant.rewards.push(reward);
      participantRewards.set(row.completion_id, reward);
    }
  }

  for (const participant of participants.values()) {
    participant.rewards.sort(
      (left, right) =>
        right.dateKey.localeCompare(left.dateKey) ||
        left.questPosition - right.questPosition,
    );
  }

  return [...participants.values()].sort(
    (left, right) =>
      right.totalStars - left.totalStars ||
      left.playerName.localeCompare(right.playerName, "ru"),
  );
}
