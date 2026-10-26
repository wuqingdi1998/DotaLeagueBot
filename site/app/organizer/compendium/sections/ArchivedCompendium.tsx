import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { COMPENDIUM_ARCHIVES } from "@/app/compendium/model/archive";
import { CompendiumRewards } from "@/app/compendium/components/CompendiumRewards";
import { CompendiumStarRaceArchive } from "@/app/compendium/admin/CompendiumStarRaceArchive";
import type { CompendiumStarRaceArchive as ArchivedRace } from "@/app/compendium/admin/types";

export function ArchivedCompendium({ personalStars, communityStars, races }: {
  personalStars: number;
  communityStars: number;
  races: ArchivedRace[];
}) {
  const archive = COMPENDIUM_ARCHIVES["ti-2026"];
  return <main className="compendium-base-page">
    <section className="compendium-base-hero">
      <Link href="/organizer" className="compendium-base-back"><FiArrowLeft aria-hidden="true" /> Архив организатора</Link>
      <span className="compendium-base-kicker">{archive.label} · Завершён</span>
      <h1>Компендиум №{archive.number}</h1>
      <p>Сохранённые награды, условия заданий и гонки за звёздами.</p>
      <div className="organizer-archive-tools">
        <Link href={archive.resultsHref}>Результаты компендиума №{archive.number}</Link>
        <Link href={archive.baseHref}>База участников компендиума №{archive.number}</Link>
      </div>
    </section>
    <div className="compendium-rewards-section">
      <CompendiumRewards personalStars={personalStars} communityStars={communityStars} />
      <CompendiumStarRaceArchive races={races} />
    </div>
  </main>;
}
