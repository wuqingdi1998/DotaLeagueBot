import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { loadHallOfFame } from "@/lib/player-profile";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { HallOfFameTable } from "./HallOfFameTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Зал славы — Linken's Sphere Esports",
  description: "Медальный зачёт участников турниров Linken's Sphere Esports.",
};

export default async function HallOfFamePage() {
  const [players, user] = await Promise.all([loadHallOfFame(), getSession()]);

  return (
    <PlatformShell user={user}>
      <section className="hall-hero">
        <h1>Зал славы</h1>
        <p>
          Медальный зачёт участников за всю историю. В зачёт идут только
          сезонные турниры — лига и кубок лиги.
        </p>
      </section>

      <section className="hall-content">
        <HallOfFameTable players={players} />
      </section>
    </PlatformShell>
  );
}
