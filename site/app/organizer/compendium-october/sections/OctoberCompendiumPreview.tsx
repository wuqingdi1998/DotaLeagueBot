import { FiCalendar } from "react-icons/fi";
import { CompendiumRewards } from "@/app/compendium/components/CompendiumRewards";
import { OCTOBER_COMPENDIUM_DATE_LABEL, type OctoberCompendiumWeekDefinition } from "../model/plan";
import { octoberRewardsForStars } from "../model/rewards";
import { OctoberDailyPreview, OctoberRacePreview } from "./OctoberActivityPreview";
import { OctoberClanShowcase } from "./OctoberClanShowcase";
import { OctoberSectionNavigation } from "../components/OctoberSectionNavigation";
import { OCTOBER_PREVIEW_SECTIONS } from "../model/sections";
import type { OctoberClanMember } from "../model/clan-members";
import type { OctoberClanReservationState } from "../model/clan-reservation";

export function OctoberCompendiumPreview({
  week,
  clanMembers,
  viewerDiscordId,
  personalStars,
  reservation,
  areDailyQuestsOpen = true,
  dailyRewardStars = 1,
}: {
  week: OctoberCompendiumWeekDefinition;
  clanMembers: readonly OctoberClanMember[];
  viewerDiscordId: string;
  personalStars: number;
  reservation?: OctoberClanReservationState;
  areDailyQuestsOpen?: boolean;
  dailyRewardStars?: 1 | 2;
}) {
  return (
    <main className="compendium-page october-compendium-preview" id="october-compendium-scroll">
      <OctoberSectionNavigation />
      <section className="october-compendium-screen october-compendium-screen-clans" id={OCTOBER_PREVIEW_SECTIONS[0].id} aria-label="Шапка компендиума и кланы">
        <div className="compendium-hero-section">
          <div className="compendium-title-block">
            <h1>Компендиум</h1>
            <p className="october-compendium-hero-line">Сезон 9. Часть 1.</p>
          </div>
          <div className="compendium-summary">
            <div className="compendium-tournament-countdown">
              <FiCalendar aria-hidden="true" />
              <span>Период события</span>
              <strong>{OCTOBER_COMPENDIUM_DATE_LABEL}</strong>
            </div>
          </div>
        </div>
        <div className="compendium-rewards-section">
          <OctoberClanShowcase
            members={clanMembers}
            viewerDiscordId={viewerDiscordId}
            reservation={reservation}
          />
        </div>
      </section>

      <section className="october-compendium-screen october-compendium-screen-personal" id={OCTOBER_PREVIEW_SECTIONS[1].id} aria-label="Личный зачёт">
        <div className="compendium-rewards-section">
          <CompendiumRewards
            personalStars={personalStars}
            communityStars={0}
            isPreview
            showCommunity={false}
            personalRewards={octoberRewardsForStars(personalStars)}
          />
        </div>
      </section>

      <section className="october-compendium-screen october-compendium-screen-race" id={OCTOBER_PREVIEW_SECTIONS[2].id} aria-label="Гонка за звёздами">
        <div className="compendium-rewards-section">
          <OctoberRacePreview week={week} />
        </div>
      </section>

      <section className="october-compendium-screen october-compendium-screen-daily" id={OCTOBER_PREVIEW_SECTIONS[3].id} aria-label="Задания дня">
        <OctoberDailyPreview
          viewerDiscordId={viewerDiscordId}
          isOpen={areDailyQuestsOpen}
          rewardStars={dailyRewardStars}
        />
      </section>
    </main>
  );
}
