import { FaDiscord, FaSteam } from "react-icons/fa";
import { FiActivity } from "react-icons/fi";
import { SiDota2 } from "react-icons/si";

export type PlayerService = "discord" | "dotabuff" | "stratz" | "steam";

export function PlayerServiceIcon({
  service,
}: {
  service: PlayerService;
}) {
  if (service === "dotabuff") return <SiDota2 aria-hidden="true" />;
  if (service === "stratz") return <FiActivity aria-hidden="true" />;
  if (service === "discord") return <FaDiscord aria-hidden="true" />;
  return <FaSteam aria-hidden="true" />;
}
