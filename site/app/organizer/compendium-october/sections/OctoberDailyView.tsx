import type { ReactNode } from "react";
import { FiArrowRight, FiInfo, FiX } from "react-icons/fi";
import { QuestCard } from "@/app/compendium/components/QuestCard";
import { HEROES_PER_QUEST } from "@/app/compendium/model/constants";
import { OCTOBER_HERO_QUEST_COUNT } from "../model/preview";
import { OCTOBER_REWARD_STARS } from "@/lib/october-reward-thresholds";
import type { OctoberDailyQuestData } from "../services/october-daily-quests";
import { OctoberClanOutingCard } from "./OctoberClanOutingCard";
import { OctoberDailyOpeningOverlay } from "../components/OctoberDailyOpeningOverlay";

type GuideKey = "daily-overview" | "clan-outing";
export type OctoberDailyViewProps = {
  isOpen: boolean; isLive: boolean; rewardStars: 1 | 2;
  dailyData?: Pick<OctoberDailyQuestData, "quests" | "rerollsRemaining" | "clanOuting">;
  quests: OctoberDailyQuestData["quests"];
  checkingQuestId: string | null; rerollingQuestId: string | null;
  isCheckingClanOuting: boolean; message: string;
  guides: { restoreAll: () => void; dismiss: (key: GuideKey) => void; isVisible: (key: GuideKey) => boolean };
  checkQuest: (questId: string) => void;
  rerollQuest: (questId: string) => void;
  checkClanOuting: () => void;
  countdown: ReactNode; rune: ReactNode;
};

export function OctoberDailyView({ isOpen, isLive, rewardStars, dailyData, quests,
  checkingQuestId, rerollingQuestId, isCheckingClanOuting, message, guides,
  checkQuest, rerollQuest, checkClanOuting, countdown, rune,
}: OctoberDailyViewProps) {
  const isOverviewVisible = guides.isVisible("daily-overview");
  const isClanOutingVisible = guides.isVisible("clan-outing");
  return (
    <section
      className={`compendium-daily-section ${
        isOverviewVisible
          ? "october-daily-section--expanded-guidance"
          : "october-daily-section--compact-guidance"
      }`}
      id="compendium-quests"
    >
      <div className="october-daily-toolbar">
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
        <div className="compendium-section-status">
          {rewardStars === 2 && (
            <div className="compendium-weekend-bonus" role="status">
              <span>Бонус выходного дня</span>
              <strong>Х2</strong>
            </div>
          )}
          {countdown}
        </div>
      </div>
      {isOverviewVisible && (
        <div className="october-compendium-example-note october-dismissible-guide">
          <p>
            Ежедневно – {OCTOBER_HERO_QUEST_COUNT} испытания по {HEROES_PER_QUEST} героев и клановая вылазка.
            С пятницы по воскресенье задания и Испытание Рун дают по две звезды.
            После {OCTOBER_REWARD_STARS.firstReroll} личных звёзд доступны две замены заданий в день,
            после {OCTOBER_REWARD_STARS.secondReroll} – три.
            {isOpen && !isLive && " Герои на карточках ниже – только пример: реальные наборы будут обновляться для каждого участника."}
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
        {rune}
      </div>
    </section>
  );
}
