import { PlayerProfileServiceLogo } from "@/app/components/PlayerProfileServiceLogo";
import { seasonMatchLinks } from "@/lib/season";

type MatchMap = {
  game_number: number;
  dota_match_id: string | null;
};

export function MatchMapLinks({
  gameCount,
  games,
}: {
  gameCount: number;
  games: MatchMap[];
}) {
  return (
    <nav className="match-map-links" aria-label="Ссылки на карты">
      {Array.from({ length: gameCount }, (_, index) => index + 1).map(
        (gameNumber) => {
          const game = games.find((item) => item.game_number === gameNumber);
          const links = game?.dota_match_id
            ? seasonMatchLinks(game.dota_match_id)
            : null;
          return (
            <span className="match-map-link-group" key={gameNumber}>
              <b>{gameNumber}</b>
              <MatchMapServiceLink
                href={links?.stratz ?? null}
                gameNumber={gameNumber}
                service="stratz"
              />
              <MatchMapServiceLink
                href={links?.dotaBuff ?? null}
                gameNumber={gameNumber}
                service="dotabuff"
              />
            </span>
          );
        },
      )}
    </nav>
  );
}

function MatchMapServiceLink({
  gameNumber,
  href,
  service,
}: {
  gameNumber: number;
  href: string | null;
  service: "stratz" | "dotabuff";
}) {
  const label = service === "stratz" ? "STRATZ" : "Dotabuff";
  const logo = (
    <PlayerProfileServiceLogo className="match-map-logo" service={service} />
  );
  if (!href) {
    return (
      <span
        className={`match-map-link ${service} unavailable`}
        aria-label={`${label}, карта ${gameNumber}: ссылка недоступна`}
        title="Ссылка на карту ещё не добавлена"
      >
        {logo}
      </span>
    );
  }
  return (
    <a
      className={`match-map-link ${service}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}, карта ${gameNumber}`}
      title={`Открыть карту ${gameNumber} в ${label}`}
    >
      {logo}
    </a>
  );
}
