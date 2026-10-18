import { createRoot } from "react-dom/client";
import { OctoberRacePreview } from "@/app/organizer/compendium-october/sections/OctoberActivityPreview";
const fixture = JSON.parse(document.getElementById("race-fixture")!.textContent!);
createRoot(document.getElementById("root")!).render(
  <main className="october-compendium-preview"><section className="october-compendium-screen october-compendium-screen-race">
    <div className="compendium-rewards-section"><OctoberRacePreview week={fixture.week} initialRace={fixture.race} serverNow={fixture.serverNow} /></div>
  </section></main>,
);
