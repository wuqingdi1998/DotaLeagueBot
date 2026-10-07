"use client";

import { useState } from "react";
import { FiArrowRight, FiInfo, FiX } from "react-icons/fi";
import { fetchSiteRequest } from "@/lib/site-request";
import { CompendiumStarRace } from "@/app/compendium/components/CompendiumStarRace";
import { QuestCard } from "@/app/compendium/components/QuestCard";
import { RuneChallenge } from "@/app/compendium/components/RuneChallenge";
import {
  HEROES_PER_QUEST,
} from "@/app/compendium/model/constants";
import { OCTOBER_HERO_QUEST_COUNT, OCTOBER_RACE_EXCLUSION_RULES, octoberDailyQuestSamples, octoberRacePreviewData } from "../model/preview";
import { OCTOBER_REWARD_STARS } from "@/lib/october-reward-thresholds";
import type { OctoberCompendiumWeekDefinition } from "../model/plan";
import { OctoberClanOutingCard } from "./OctoberClanOutingCard";
import { useOctoberGuideVisibility } from "../hooks/useOctoberGuideVisibility";
import { OctoberDailyOpeningOverlay } from "../components/OctoberDailyOpeningOverlay";
import type { OctoberDailyQuestData } from "../services/october-daily-quests";
import type { QuestCompletion } from "@/app/compendium/model/types";
import { useServerClock } from "@/app/compendium/hooks/useServerClock";
import { useCompendiumToast } from "@/app/compendium/hooks/useCompendiumToast";
import { reloadOctoberCompendiumAfterReward } from "../services/reward-refresh";
import {
  starRaceQuestProgressLabel,
  isOctoberFirstRaceWeek,
  OCTOBER_FIRST_WEEK_RACE_RULES,
  type StarRaceData,
} from "@/app/compendium/model/star-race";

function ignorePreviewAction() {}

const progressNumber = new Intl.NumberFormat("ru-RU");

export function OctoberRacePreview({
  week,
  initialRace,
  serverNow,
}: {
  week: OctoberCompendiumWeekDefinition;
  initialRace?: StarRaceData;
  serverNow?: string;
}) {
  const [race, setRace] = useState(initialRace ?? octoberRacePreviewData(week));
  const [checkingDateKey, setCheckingDateKey] = useState<string | null>(null);
  const [message, setMessage] = useCompendiumToast();
  const currentTimeMs = useServerClock(serverNow ?? "1970-01-01T00:00:00.000Z");
  const isLive = initialRace !== undefined;

  async function checkQuest(dateKey: string) {
    if (!isLive || checkingDateKey) return;
    setCheckingDateKey(dateKey);
    try {
      const response = await fetchSiteRequest(
        `/api/compendium/star-race/quests/${dateKey}/check`,
        { method: "POST" },
      );
      const result = await response.json() as {
        error?: string;
        completion?: unknown | null;
        progress?: { current: number; target: number } | null;
        heroProgress?: { wins: unknown[]; target: number } | null;
        rewardStars?: number;
        starRace?: StarRaceData;
      };
      if (!response.ok || !result.starRace) {
        throw new Error(result.error ?? "Не удалось проверить задание гонки");
      }
      setRace(result.starRace);
      if (result.completion) {
        reloadOctoberCompendiumAfterReward();
        return;
      }
      const checkedQuest = result.starRace.quests.find(
        (quest) => quest.dateKey === dateKey,
      );
      const progressLabel = checkedQuest
        ? starRaceQuestProgressLabel(checkedQuest)
        : null;
      setMessage(
        result.completion
          ? `Задание выполнено. Получено звёзд: ${result.rewardStars ?? 2}.`
          : result.heroProgress
            ? `Засчитано героев: ${result.heroProgress.wins.length} из ${result.heroProgress.target}.`
            : `${progressLabel ?? "Прогресс"}: ${progressNumber.format(result.progress?.current ?? 0)} из ${progressNumber.format(result.progress?.target ?? 0)}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось проверить задание гонки");
    } finally {
      setCheckingDateKey(null);
    }
  }

  return (
    <>
      <CompendiumStarRace
        race={race}
        currentTimeMs={currentTimeMs}
        checkingDateKey={checkingDateKey}
        canCheck={isLive && checkingDateKey === null}
        onCheck={checkQuest}
        isSubmittingPrediction={false}
        onSubmitPrediction={ignorePreviewAction}
        isPreview={!isLive}
        collapsibleRulesOnMobile
        sectionId={`october-race-${week.id}`}
        exclusionRules={isOctoberFirstRaceWeek(race) ? OCTOBER_FIRST_WEEK_RACE_RULES : OCTOBER_RACE_EXCLUSION_RULES}
      />
      {message && <div className="compendium-toast" role="status">{message}</div>}
    </>
  );
}

export function OctoberDailyPreview({
  viewerDiscordId,
  isOpen = true,
  rewardStars = 1,
  initialData,
  serverNow,
}: {
  viewerDiscordId: string;
  isOpen?: boolean;
  rewardStars?: 1 | 2;
  initialData?: OctoberDailyQuestData;
  serverNow?: string;
}) {
  const guides = useOctoberGuideVisibility(viewerDiscordId);
  const [dailyData, setDailyData] = useState(initialData);
  const [checkingQuestId, setCheckingQuestId] = useState<string | null>(null);
  const [rerollingQuestId, setRerollingQuestId] = useState<string | null>(null);
  const [isCheckingClanOuting, setIsCheckingClanOuting] = useState(false);
  const [message, setMessage] = useCompendiumToast();
  const isOverviewVisible = guides.isVisible("daily-overview");
  const isClanOutingVisible = guides.isVisible("clan-outing");
  const quests = dailyData?.quests ?? octoberDailyQuestSamples();
  const isLive = isOpen && dailyData !== undefined;
  const currentTimeMs = useServerClock(serverNow ?? "1970-01-01T00:00:00.000Z");

  async function checkQuest(questId: string) {
    if (!isLive || checkingQuestId || rerollingQuestId) return;
    setCheckingQuestId(questId);
    try {
      const response = await fetchSiteRequest(`/api/compendium/daily-quests/${questId}/check`, {
        method: "POST",
      });
      const result = await response.json() as {
        error?: string;
        completion?: QuestCompletion;
        quests?: OctoberDailyQuestData["quests"];
        rerollsRemaining?: number;
      };
      if (!response.ok || !result.completion) throw new Error(result.error ?? "Не удалось проверить задание");
      setDailyData((current) => current && ({
        ...current,
        quests: result.quests ?? current.quests.map((quest) =>
          quest.id === questId ? { ...quest, completion: result.completion ?? null } : quest,
        ),
        rerollsRemaining: result.rerollsRemaining ?? current.rerollsRemaining,
      }));
      setMessage(`Испытание выполнено. Получено звёзд: ${rewardStars}.`);
      reloadOctoberCompendiumAfterReward();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось проверить задание");
    } finally {
      setCheckingQuestId(null);
    }
  }

  async function rerollQuest(questId: string) {
    if (!isLive || checkingQuestId || rerollingQuestId || !dailyData?.rerollsRemaining) return;
    setRerollingQuestId(questId);
    try {
      const response = await fetchSiteRequest(`/api/compendium/daily-quests/${questId}/reroll`, {
        method: "POST",
      });
      const result = await response.json() as {
        error?: string;
        quest?: OctoberDailyQuestData["quests"][number];
        rerollsRemaining?: number;
      };
      if (!response.ok || !result.quest) throw new Error(result.error ?? "Не удалось заменить задание");
      setDailyData((current) => current && ({
        ...current,
        quests: current.quests.map((quest) => quest.id === questId ? result.quest ?? quest : quest),
        rerollsRemaining: result.rerollsRemaining ?? 0,
      }));
      setMessage(`Испытание заменено. Осталось замен: ${result.rerollsRemaining ?? 0}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось заменить задание");
    } finally {
      setRerollingQuestId(null);
    }
  }

  async function checkClanOuting() {
    if (!isLive || isCheckingClanOuting) return;
    setIsCheckingClanOuting(true);
    try {
      const response = await fetchSiteRequest("/api/compendium/clan-outing/check", { method: "POST" });
      const result = await response.json() as {
        error?: string;
        completion?: OctoberDailyQuestData["clanOuting"];
      };
      if (!response.ok || !result.completion) throw new Error(result.error ?? "Не удалось проверить вылазку");
      setDailyData((current) => current && ({ ...current, clanOuting: result.completion ?? current.clanOuting }));
      setMessage(`Клановая вылазка выполнена. Получено звёзд: ${rewardStars}.`);
      reloadOctoberCompendiumAfterReward();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось проверить вылазку");
    } finally {
      setIsCheckingClanOuting(false);
    }
  }
  return (
    <section
      className={`compendium-daily-section ${
        isOverviewVisible
          ? "october-daily-section--expanded-guidance"
          : "october-daily-section--compact-guidance"
      }`}
      id="compendium-quests"
    >
      <div className="compendium-section-heading october-daily-heading">
        <div className="october-daily-heading-row">
          <h2>Задания дня</h2>
          <button
            className="october-guide-restore"
            type="button"
            aria-label="Вернуть пояснения к заданиям"
            title="Вернуть скрытые пояснения"
            onClick={guides.restoreAll}
          >
            <FiInfo aria-hidden="true" />
          </button>
        </div>
        {rewardStars === 2 && (
          <div className="compendium-weekend-bonus" role="status">
            <span>Бонус выходного дня</span>
            <strong>Х2</strong>
          </div>
        )}
      </div>
      {isOverviewVisible && (
        <div className="october-compendium-example-note october-dismissible-guide">
          <p>
            Каждый день – {OCTOBER_HERO_QUEST_COUNT} испытания по {HEROES_PER_QUEST} героев и одна
            клановая вылазка. Для всех трёх заданий и Испытания Рун действует бонус выходного дня:
            в субботу и воскресенье даётся две звезды вместо одной. Клановая вылазка может
            закрыться одновременно с испытанием 1 или 2. После {OCTOBER_REWARD_STARS.firstReroll} личных звёзд доступно две
            замены заданий в день, после {OCTOBER_REWARD_STARS.secondReroll} – три.
            {isOpen && " Герои на карточках ниже – только пример: реальные наборы будут обновляться для каждого участника."}
          </p>
          <button
            type="button"
            aria-label="Скрыть пояснение к заданиям дня"
            onClick={() => guides.dismiss("daily-overview")}
          >
            <FiX aria-hidden="true" />
          </button>
        </div>
      )}
      <p className="compendium-mobile-swipe-hint">
        Листайте задания влево и вправо <FiArrowRight aria-hidden="true" />
      </p>
      <div className="october-daily-challenges">
        <div className="compendium-quest-grid quest-count-3">
          {quests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              rewardStars={rewardStars}
              isChecking={checkingQuestId === quest.id}
              isRerolling={rerollingQuestId === quest.id}
              canCheck={isLive && checkingQuestId === null && rerollingQuestId === null}
              hasReroll={(dailyData?.rerollsRemaining ?? 1) > 0}
              rerollsRemaining={dailyData?.rerollsRemaining ?? 1}
              canReroll={isLive && (dailyData?.rerollsRemaining ?? 0) > 0 && checkingQuestId === null && rerollingQuestId === null}
              onCheck={checkQuest}
              onReroll={rerollQuest}
              isPreview={!isLive}
              overlay={isOpen ? undefined : <OctoberDailyOpeningOverlay />}
            />
          ))}
          <OctoberClanOutingCard
            rewardStars={rewardStars}
            isNoteVisible={isClanOutingVisible}
            onDismissNote={() => guides.dismiss("clan-outing")}
            overlay={isOpen ? undefined : <OctoberDailyOpeningOverlay />}
            completion={dailyData?.clanOuting}
            isChecking={isCheckingClanOuting}
            canCheck={isLive}
            onCheck={() => void checkClanOuting()}
          />
        </div>
        {message && <div className="compendium-toast" role="status">{message}</div>}
        <RuneChallenge
          initialChallenge={dailyData?.runeChallenge ?? {
            hasAccess: true,
            accessRoleName: "Предпросмотр подписки",
            selection: null,
            completion: null,
          }}
          currentTimeMs={currentTimeMs}
          rewardStars={rewardStars}
          resetCountdown=""
          onStarsChange={ignorePreviewAction}
          onCompleted={reloadOctoberCompendiumAfterReward}
          isPreview={!isLive}
          showPreviewContent={!isLive}
          overlay={isOpen ? undefined : <OctoberDailyOpeningOverlay />}
        />
      </div>
    </section>
  );
}
