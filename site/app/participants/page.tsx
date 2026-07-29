import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { loadParticipantDirectory } from "@/lib/participants";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { ParticipantsTable } from "./ParticipantsTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Участники — Linken's Sphere Esports",
  description:
    "Участники Linken's Sphere Esports, их турнирные тиры и игровые профили.",
};

export default async function ParticipantsPage() {
  const user = await getSession();
  const players = await loadParticipantDirectory(user?.isAdmin ?? false);

  return (
    <PlatformShell user={user}>
      <section className="hall-hero participants-hero">
        <h1>Участники</h1>
        <p>
          Все зарегистрированные участники сообщества, их актуальный турнирный
          тир и ссылки на игровые профили.
        </p>
      </section>

      <section className="hall-content">
        <ParticipantsTable
          players={players}
          isOrganizer={user?.isAdmin ?? false}
          organizerDotaId={user?.dotaId ?? null}
        />
      </section>
    </PlatformShell>
  );
}
