import { SupporterGallery } from "./SupporterGallery";
import type { SupporterDirectory } from "../services/supporters";

export function BoostyHero({
  directory,
}: {
  directory: SupporterDirectory;
}) {
  return (
    <section className="boosty-hero">
      <div className="boosty-hero-content">
        <div className="boosty-hero-copy">
          <h1>
            Поддержи сервер и наши турниры - получи приятные преимущества!
          </h1>
          <p>
            Выберите подходящий уровень поддержки, получите особую роль в Discord
            и дополнительные возможности в ходе 9-го сезона.
          </p>
        </div>
        <SupporterGallery directory={directory} />
      </div>
    </section>
  );
}
