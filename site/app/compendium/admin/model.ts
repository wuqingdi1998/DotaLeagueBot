import { compendiumHeroById } from "../model/heroes";
import { moscowDateLabel } from "../model/time";
import type {
  CompendiumAdminCurrentQuest,
  CompendiumAdminCurrentQuestSourceRow,
  CompendiumAdminParticipant,
  CompendiumAdminParticipantSummary,
  CompendiumAdminParticipantSummaryRow,
  CompendiumAdminSourceRow,
  CompendiumRewardHistory,
} from "./types";

export function buildCompendiumAdminParticipantSummaries(
  rows: CompendiumAdminParticipantSummaryRow[],
  currentQuestRows: CompendiumAdminCurrentQuestSourceRow[] = [],
): CompendiumAdminParticipantSummary[] {
  const participants = new Map<string, CompendiumAdminParticipantSummary>(
    rows.map((row) => [row.player_id, {
      discordId: row.player_id,
      dotaId: row.dota_id,
      playerName: row.player_name,
      avatarUrl: row.avatar_url,
      totalStars: row.total_stars,
      rewardCount: row.reward_count,
      currentQuests: [],
    }]),
  );
  const questsByParticipant = new Map<
    string,
    Map<string, CompendiumAdminCurrentQuest>
  >();
  for (const row of currentQuestRows) {
    if (!participants.has(row.player_id)) continue;
    const participantQuests = questsByParticipant.get(row.player_id) ??
      new Map<string, CompendiumAdminCurrentQuest>();
    const quest = participantQuests.get(row.quest_id) ?? {
      id: row.quest_id,
      position: row.quest_position,
      heroes: [],
    };
    quest.heroes.push(compendiumHeroById(row.hero_id));
    participantQuests.set(row.quest_id, quest);
    questsByParticipant.set(row.player_id, participantQuests);
  }
  for (const [playerId, quests] of questsByParticipant) {
    participants.get(playerId)!.currentQuests = [...quests.values()].sort(
      (left, right) => left.position - right.position,
    );
  }
  return [...participants.values()].sort(
    (left, right) =>
      right.totalStars - left.totalStars ||
      left.playerName.localeCompare(right.playerName, "ru"),
  );
}

export function buildCompendiumAdminParticipants(
  rows: CompendiumAdminSourceRow[],
  currentQuestRows: CompendiumAdminCurrentQuestSourceRow[] = [],
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
      currentQuests: [],
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
      row.history_kind === "star_race" &&
      row.matched_hero_id !== null &&
      row.matched_match_id
    ) {
      const existingReward = participantRewards.get(historyId);
      const reward = existingReward?.kind === "star_race" ? existingReward : {
        kind: "star_race" as const,
        id: historyId,
        dateKey: row.moscow_date,
        dateLabel: moscowDateLabel(row.moscow_date),
        completedAt: row.completed_at.toISOString(),
        rewardAmount: row.reward_amount,
        wins: [],
      };
      reward.wins.push({
        hero: compendiumHeroById(row.matched_hero_id),
        matchedMatchId: row.matched_match_id,
      });
      if (!participantRewards.has(historyId)) {
        participant.rewards.push(reward);
        participantRewards.set(historyId, reward);
      }
      continue;
    }
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

  const currentQuestsByParticipant = new Map<
    string,
    Map<string, CompendiumAdminCurrentQuest>
  >();
  for (const row of currentQuestRows) {
    const participant = participants.get(row.player_id);
    if (!participant) continue;
    const participantQuests = currentQuestsByParticipant.get(row.player_id) ??
      new Map<string, CompendiumAdminCurrentQuest>();
    const quest = participantQuests.get(row.quest_id) ?? {
      id: row.quest_id,
      position: row.quest_position,
      heroes: [],
    };
    quest.heroes.push(compendiumHeroById(row.hero_id));
    participantQuests.set(row.quest_id, quest);
    currentQuestsByParticipant.set(row.player_id, participantQuests);
  }

  for (const [playerId, quests] of currentQuestsByParticipant) {
    const participant = participants.get(playerId);
    if (!participant) continue;
    participant.currentQuests = [...quests.values()].sort(
      (left, right) => left.position - right.position,
    );
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
