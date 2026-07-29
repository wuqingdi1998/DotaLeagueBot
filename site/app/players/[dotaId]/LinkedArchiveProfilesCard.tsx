import type { LinkedArchiveProfile } from "@/lib/player-profile-organizer";

export function LinkedArchiveProfilesCard({
  profiles,
}: {
  profiles: LinkedArchiveProfile[];
}) {
  return (
    <section className="profile-side-card linked-archive-card">
      <p className="section-kicker">Только для организатора</p>
      <h2>Связанные архивные профили</h2>
      {profiles.length ? (
        <div className="linked-archive-list">
          {profiles.map((profile) => (
            <article key={profile.playerId}>
              <strong>{profile.primaryNickname}</strong>
              {profile.aliases.length > 1 && (
                <span>
                  Другие ники:{" "}
                  {profile.aliases
                    .filter(
                      (alias) =>
                        alias.localeCompare(
                          profile.primaryNickname,
                          "ru-RU",
                          { sensitivity: "accent" },
                        ) !== 0,
                    )
                    .join(", ")}
                </span>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="profile-card-note">
          К этому участнику архивные профили не привязаны.
        </p>
      )}
    </section>
  );
}
