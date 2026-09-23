import Link from "next/link";
import { FiArrowRight, FiAward, FiBookOpen, FiStar } from "react-icons/fi";

const archivePages = [
  {
    href: "/organizer/compendium",
    title: "Компендиум",
    description: "Сохранённая страница Компендиума с заданиями, наградами и прогнозами.",
    icon: FiBookOpen,
    badge: null,
  },
  {
    href: "/organizer/compendium/results",
    title: "Результаты компендиума",
    description: "Итоги сообщества, личные результаты и победители гонки звёзд.",
    icon: FiAward,
    badge: null,
  },
  {
    href: "/organizer/compendium-october",
    title: "Новый компендиум",
    description: "Закрытый план на 5–25 октября: три недели, задания и гонки за звёздами.",
    icon: FiStar,
    badge: "Будущий апдейт",
  },
] as const;

export function OrganizerArchive() {
  return (
    <section className="organizer-archive">
      <div className="organizer-archive-heading">
        <p>Сохранённые страницы</p>
        <h1>Архив организатора</h1>
        <span>
          Здесь остаются служебные версии завершённых страниц, скрытые из
          основного меню сайта.
        </span>
      </div>

      <nav className="organizer-archive-menu" aria-label="Архив организатора">
        {archivePages.map((item) => {
          const Icon = item.icon;
          return (
            <Link href={item.href} key={item.href}>
              <Icon className="organizer-archive-menu-icon" aria-hidden="true" />
              <span>
                <strong>{item.title}</strong>
                {item.badge && <span className="organizer-archive-badge">{item.badge}</span>}
                <small>{item.description}</small>
              </span>
              <FiArrowRight className="organizer-archive-menu-arrow" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
