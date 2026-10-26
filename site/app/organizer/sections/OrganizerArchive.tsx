import Link from "next/link";
import { FiArrowRight, FiAward, FiBookOpen, FiDatabase, FiPlayCircle } from "react-icons/fi";
import { COMPENDIUM_ARCHIVES } from "@/app/compendium/model/archive";

const archiveActions = [
  { hrefKey: "pageHref", title: "Страница", icon: FiBookOpen },
  { hrefKey: "resultsHref", title: "Результаты", icon: FiAward },
  { hrefKey: "baseHref", title: "База участников", icon: FiDatabase },
] as const;

export function OrganizerArchive() {
  return (
    <section className="organizer-archive">
      <div className="organizer-archive-heading">
        <p>Сохранённые страницы</p>
        <h1>Архив организатора</h1>
        <span>
          Страницы, результаты и базы участников каждого компендиума.
        </span>
      </div>

      {Object.values(COMPENDIUM_ARCHIVES).sort((left, right) => right.number - left.number).map((archive) => (
        <section className="organizer-compendium-archive" key={archive.period} aria-labelledby={`archive-compendium-${archive.number}`}>
          <header className="organizer-compendium-archive-heading">
            <h2 id={`archive-compendium-${archive.number}`}>Компендиум №{archive.number}</h2>
            <p>{archive.label}</p>
          </header>
          <nav className="organizer-archive-menu" aria-label={`Компендиум №${archive.number}`}>
            {archiveActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link href={archive[action.hrefKey]} key={action.hrefKey} aria-label={`${action.title} компендиума №${archive.number}`}>
                  <Icon className="organizer-archive-menu-icon" aria-hidden="true" />
                  <span><strong>{action.title}</strong></span>
                  <FiArrowRight className="organizer-archive-menu-arrow" aria-hidden="true" />
                </Link>
              );
            })}
          </nav>
        </section>
      ))}
      <div className="organizer-archive-tools">
        <Link href="/organizer/compendium-october/launch">
          <FiPlayCircle aria-hidden="true" /> Отчёт о запуске компендиума №{COMPENDIUM_ARCHIVES.october.number}
        </Link>
      </div>
    </section>
  );
}
