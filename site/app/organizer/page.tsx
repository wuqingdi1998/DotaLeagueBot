import type { Metadata } from "next";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { LoginScreen } from "@/app/auth/components/LoginScreen";
import { getSession } from "@/lib/auth";
import { OrganizerArchive } from "./sections/OrganizerArchive";
import { OrganizerPasswordSettings } from "./sections/OrganizerPasswordSettings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Архив организатора — Linken's Sphere Esports",
};

export default async function OrganizerPage() {
  const user = await getSession();

  return (
    <PlatformShell user={user}>
      {user?.isAdmin ? (
        <div className="organizer-dashboard" id="dashboard">
          <OrganizerArchive />
          <OrganizerPasswordSettings />
        </div>
      ) : (
        <LoginScreen user={user} returnTo="/organizer" />
      )}
    </PlatformShell>
  );
}
