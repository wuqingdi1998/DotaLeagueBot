import { LeagueOverviewCard } from "../components/LeagueOverviewCard";
import { LeagueCupOverviewCard } from "../components/LeagueCupOverviewCard";
import { seasonIntroduction } from "../model/season-overview-model";
import { FastCupsOverview } from "./FastCupsOverview";

export function SeasonOverviewPage() {
  return (
    <section className="season-overview" aria-labelledby="season-title">
      <header className="season-overview-heading">
        <p className="eyebrow">Linken&apos;s Sphere Esports</p>
        <h1 id="season-title">Сезон</h1>
        <p>{seasonIntroduction}</p>
      </header>

      <div className="season-overview-grid">
        <LeagueOverviewCard />
        <div className="season-secondary-column">
          <LeagueCupOverviewCard />
          <FastCupsOverview />
        </div>
      </div>
    </section>
  );
}
