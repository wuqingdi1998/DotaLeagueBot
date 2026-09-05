import { FiHeart } from "react-icons/fi";
import { AvatarImage } from "@/app/components/AvatarImage";
import type { SupporterDirectory } from "../services/supporters";

export function SupporterGallery({
  directory,
}: {
  directory: SupporterDirectory;
}) {
  return (
    <section className="boosty-supporters" aria-labelledby="boosty-supporters-title">
      <div className="boosty-section-heading">
        <span>Спасибо за поддержку</span>
        <h2 id="boosty-supporters-title">Наши суппортеры</h2>
        <p>
          Эти участники помогают сообществу развиваться и проводить новые
          турниры.
        </p>
      </div>

      {directory.supporters.length ? (
        <div className="boosty-supporter-grid">
          {directory.supporters.map((supporter) => (
            <article className="boosty-supporter-card" key={supporter.discordId}>
              <AvatarImage
                source={supporter.avatarUrl}
                alt=""
                width={64}
                height={64}
                unoptimized
                fallback={
                  <span className="boosty-supporter-avatar-fallback">
                    {supporter.name.slice(0, 1).toUpperCase()}
                  </span>
                }
              />
              <div>
                <strong>{supporter.name}</strong>
                <span>
                  <FiHeart aria-hidden="true" /> Суппортер
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="boosty-supporters-empty">Список суппортеров пока пуст.</p>
      )}

      {!directory.isComplete && directory.supporters.length > 0 && (
        <p className="boosty-supporters-note">
          Discord временно недоступен, поэтому показаны сохранённые участники.
        </p>
      )}
    </section>
  );
}
