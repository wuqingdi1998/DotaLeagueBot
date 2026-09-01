import Link from "next/link";
import { FiArrowRight, FiCalendar } from "react-icons/fi";
import { LeagueOverviewCard } from "../components/LeagueOverviewCard";
import { LeagueCupOverviewCard } from "../components/LeagueCupOverviewCard";
import {
  leagueOverview,
  seasonIntroduction,
} from "../model/season-overview-model";
import { FastCupsOverview } from "./FastCupsOverview";

export function SeasonOverviewPage() {
  return (
    <section className="season-overview" aria-labelledby="season-title">
      <header className="season-overview-heading">
        <div className="season-overview-title-row">
          <div>
            <p className="eyebrow">Linken&apos;s Sphere Esports</p>
            <h1 id="season-title">Сезон</h1>
          </div>
          <Link className="season-calendar-link" href={leagueOverview.calendarHref}>
            <FiCalendar aria-hidden="true" />
            Смотреть календарь
            <FiArrowRight aria-hidden="true" />
          </Link>
        </div>
        <p>{seasonIntroduction}</p>
      </header>

      <div className="season-primary-grid">
        <LeagueOverviewCard />
        <LeagueCupOverviewCard />
      </div>
      <FastCupsOverview />
    </section>
  );
}
