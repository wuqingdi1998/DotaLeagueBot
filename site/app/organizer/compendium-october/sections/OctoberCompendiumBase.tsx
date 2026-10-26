import Link from "next/link";
import { FinalRacePreview } from "@/app/compendium/admin/FinalRacePreview";
import { FaStar } from "react-icons/fa";
import { FiArrowLeft, FiGift } from "react-icons/fi";
import { OCTOBER_COMPENDIUM_DATE_LABEL, OCTOBER_COMPENDIUM_WEEKS } from "../model/plan";
import { octoberRewardsForStars } from "../model/rewards";
import { CompendiumRewards } from "@/app/compendium/components/CompendiumRewards";
import { OctoberRacePreview } from "./OctoberActivityPreview";
import { OctoberClanShowcase } from "./OctoberClanShowcase";
import type { OctoberClanMember } from "../model/clan-members";
import type { SeasonTournamentLinks } from "@/app/season/model/season-overview-model";
import { COMPENDIUM_ARCHIVES } from "@/app/compendium/model/archive";

export function OctoberCompendiumBase({
  clanMembers,
  viewerDiscordId,
  tournamentLinks,
}: {
  clanMembers: readonly OctoberClanMember[];
  viewerDiscordId: string;
  tournamentLinks: SeasonTournamentLinks;
}) {
  return (
    <main className="compendium-base-page october-compendium-base">
      <section className="compendium-base-hero">
        <Link href="/organizer/compendium-october" className="compendium-base-back">
          <FiArrowLeft aria-hidden="true" /> Вернуться в компендиум
        </Link>
        <span className="compendium-base-kicker">Только для организатора</span>
        <h1>План заданий компендиума №{COMPENDIUM_ARCHIVES.october.number}</h1>
        <p>
          Условия всех трёх недель и награды. Этот раздел доступен только организаторам.
        </p>
        <div className="compendium-base-totals">
          <div><FiGift aria-hidden="true" /><strong>3</strong><span>недельные гонки</span></div>
          <div><FaStar aria-hidden="true" /><strong>21</strong><span>задание гонок</span></div>
          <div><FiGift aria-hidden="true" /><strong>{OCTOBER_COMPENDIUM_WEEKS[0].prizes.length}</strong><span>призовых мест в каждой</span></div>
        </div>
      </section>
      <div className="compendium-rewards-section">
        <OctoberClanShowcase
          members={clanMembers}
          viewerDiscordId={viewerDiscordId}
          isOrganizer
          tournamentLinks={tournamentLinks}
        />
        <CompendiumRewards
          personalStars={0}
          communityStars={0}
          isPreview
          showCommunity={false}
          personalRewards={octoberRewardsForStars(80)}
        />
        <p className="october-compendium-example-note">{OCTOBER_COMPENDIUM_DATE_LABEL} · все условия по московскому времени</p>
        {OCTOBER_COMPENDIUM_WEEKS.map((week) => (
          <OctoberRacePreview key={week.id} week={week} />
        ))}
      </div>
      <FinalRacePreview />
    </main>
  );
}
