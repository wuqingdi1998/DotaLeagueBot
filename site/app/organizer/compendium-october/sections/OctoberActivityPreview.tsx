"use client";

import { FiArrowRight, FiInfo, FiX } from "react-icons/fi";
import { CompendiumStarRace } from "@/app/compendium/components/CompendiumStarRace";
import { QuestCard } from "@/app/compendium/components/QuestCard";
import { RuneChallenge } from "@/app/compendium/components/RuneChallenge";
import {
  HEROES_PER_QUEST,
  QUEST_REWARD_STARS,
} from "@/app/compendium/model/constants";
import { OCTOBER_HERO_QUEST_COUNT, OCTOBER_RACE_EXCLUSION_RULES, octoberDailyQuestSamples, octoberRacePreviewData } from "../model/preview";
import { OCTOBER_REWARD_STARS } from "@/lib/october-reward-thresholds";
import type { OctoberCompendiumWeekDefinition } from "../model/plan";
import { OctoberClanOutingCard } from "./OctoberClanOutingCard";
import { useOctoberGuideVisibility } from "../hooks/useOctoberGuideVisibility";

function ignorePreviewAction() {}

export function OctoberRacePreview({ week }: { week: OctoberCompendiumWeekDefinition }) {
  return (
    <CompendiumStarRace
      race={octoberRacePreviewData(week)}
      currentTimeMs={0}
      checkingDateKey={null}
      canCheck={false}
      onCheck={ignorePreviewAction}
      isSubmittingPrediction={false}
      onSubmitPrediction={ignorePreviewAction}
      isPreview
      collapsibleRulesOnMobile
      sectionId={`october-race-${week.id}`}
      exclusionRules={OCTOBER_RACE_EXCLUSION_RULES}
    />
  );
}

export function OctoberDailyPreview({ viewerDiscordId }: { viewerDiscordId: string }) {
  const guides = useOctoberGuideVisibility(viewerDiscordId);
  const isOverviewVisible = guides.isVisible("daily-overview");
  const isClanOutingVisible = guides.isVisible("clan-outing");
  return (
    <section
      className={`compendium-daily-section${isOverviewVisible ? "" : " october-daily-section--compact-guidance"}`}
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
      </div>
      {isOverviewVisible && (
        <div className="october-compendium-example-note october-dismissible-guide">
          <p>
            Каждый день – {OCTOBER_HERO_QUEST_COUNT} испытания по {HEROES_PER_QUEST} героев и одна
            клановая вылазка. За победу на герое даётся звезда, в пятницу, субботу и воскресенье – две.
            Клановая вылазка всегда даёт по одной звезде каждому игроку и может закрыться одновременно
            с испытанием 1 или 2. После {OCTOBER_REWARD_STARS.firstReroll} личных звёзд доступно две
            замены заданий в день, после {OCTOBER_REWARD_STARS.secondReroll} – три.
            Герои на карточках ниже – только пример: реальные наборы будут обновляться для каждого участника.
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
      <div className="compendium-quest-grid quest-count-3">
        {octoberDailyQuestSamples().map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            rewardStars={QUEST_REWARD_STARS}
            isChecking={false}
            isRerolling={false}
            canCheck={false}
            hasReroll={false}
            canReroll={false}
            onCheck={ignorePreviewAction}
            onReroll={ignorePreviewAction}
            isPreview
          />
        ))}
        <OctoberClanOutingCard
          isNoteVisible={isClanOutingVisible}
          onDismissNote={() => guides.dismiss("clan-outing")}
        />
      </div>
      <RuneChallenge
        initialChallenge={{
          hasAccess: false,
          accessRoleName: null,
          selection: null,
          completion: null,
        }}
        currentTimeMs={0}
        rewardStars={QUEST_REWARD_STARS}
        resetCountdown=""
        onStarsChange={ignorePreviewAction}
        isPreview
      />
    </section>
  );
}
