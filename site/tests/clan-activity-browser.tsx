import { createRoot } from "react-dom/client";
import { OctoberClanLead } from "@/app/organizer/compendium-october/components/OctoberClanLead";
import { OctoberClanStandings } from "@/app/organizer/compendium-october/components/OctoberClanStandings";

const members = [{ discordId: "1", dotaId: "1", playerName: "Участник", avatarUrl: null,
  clanId: "morbus" as const, totalPoints: 1 }];
createRoot(document.getElementById("root")!).render(
  <main className="october-compendium-preview">
    <OctoberClanLead members={members} />
    <OctoberClanStandings clanId="morbus" clanName="Морбус" clanEmblem="/compendium/october/morbus-emblem.png" members={members} />
  </main>,
);
