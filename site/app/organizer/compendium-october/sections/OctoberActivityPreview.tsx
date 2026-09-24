"use client";

import { FiArrowRight } from "react-icons/fi";
import { CompendiumStarRace } from "@/app/compendium/components/CompendiumStarRace";
import { QuestCard } from "@/app/compendium/components/QuestCard";
import { RuneChallenge } from "@/app/compendium/components/RuneChallenge";
import {
  BONUS_QUEST_STAR_THRESHOLD,
  DAILY_QUEST_COUNT,
  HEROES_PER_QUEST,
  QUEST_REWARD_STARS,
  REROLL_REWARD_STAR_THRESHOLD,
  REWARDED_DAILY_REROLL_COUNT,
} from "@/app/compendium/model/constants";
import { octoberDailyQuestSamples, octoberRacePreviewData } from "../model/preview";
import type { OctoberCompendiumWeekDefinition } from "../model/plan";

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
      sectionId={`october-race-${week.id}`}
    />
  );
}

export function OctoberDailyPreview() {
  return (
    <section className="compendium-daily-section" id="compendium-quests">
      <div className="compendium-section-heading">
        <div>
          <span>Такие же, как в прошлом компендиуме</span>
          <h2>Задания дня</h2>
        </div>
      </div>
      <p className="october-compendium-example-note">
        Каждый день – {DAILY_QUEST_COUNT} задания по {HEROES_PER_QUEST} героев. За победу даётся
        звезда, в пятницу, субботу и воскресенье – две. После {REROLL_REWARD_STAR_THRESHOLD} личных
        звёзд доступно {REWARDED_DAILY_REROLL_COUNT} замены в день, после {BONUS_QUEST_STAR_THRESHOLD} – четвёртое
        задание. Герои на карточках ниже – только пример: реальные наборы будут обновляться для каждого участника.
      </p>
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
