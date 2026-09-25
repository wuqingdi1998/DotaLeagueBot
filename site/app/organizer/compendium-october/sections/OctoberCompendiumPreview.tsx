import Link from "next/link";
import { FiArrowLeft, FiCalendar, FiDatabase } from "react-icons/fi";
import { CompendiumRewards } from "@/app/compendium/components/CompendiumRewards";
import { OCTOBER_COMPENDIUM_DATE_LABEL, type OctoberCompendiumWeekDefinition } from "../model/plan";
import { octoberRewardsForStars } from "../model/rewards";
import { OctoberDailyPreview, OctoberRacePreview } from "./OctoberActivityPreview";
import { OctoberClanShowcase } from "./OctoberClanShowcase";

export function OctoberCompendiumPreview({
  week,
}: {
  week: OctoberCompendiumWeekDefinition;
}) {
  return (
    <main className="compendium-page october-compendium-preview">
      <section className="compendium-hero-section has-organizer-link">
        <div className="compendium-orb compendium-orb-one" />
        <div className="compendium-orb compendium-orb-two" />
        <Link
          className="compendium-base-link compendium-base-floating-link"
          href="/organizer/compendium-october/base"
        >
          <FiDatabase aria-hidden="true" /> База
        </Link>
        <div className="compendium-title-block">
          <p className="compendium-kicker">{OCTOBER_COMPENDIUM_DATE_LABEL} · закрытый просмотр</p>
          <h1>Компендиум</h1>
          <p className="october-compendium-hero-line">Два клана. Один победитель.</p>
          <Link className="compendium-base-link" href="/organizer">
            <FiArrowLeft aria-hidden="true" /> Архив организатора
          </Link>
        </div>
        <div className="compendium-summary">
          <div className="compendium-tournament-countdown">
            <FiCalendar aria-hidden="true" />
            <span>Период события</span>
            <strong>{OCTOBER_COMPENDIUM_DATE_LABEL}</strong>
          </div>
        </div>
      </section>

      <div className="compendium-rewards-section">
        <OctoberClanShowcase />
        <CompendiumRewards
          personalStars={0}
          communityStars={0}
          isPreview
          showCommunity={false}
          personalRewards={octoberRewardsForStars(0)}
        />
        <OctoberRacePreview week={week} />
      </div>

      <OctoberDailyPreview />
    </main>
  );
}
