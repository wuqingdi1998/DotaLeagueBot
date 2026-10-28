import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { LoginScreen } from "@/app/auth/components/LoginScreen";
import { CupConstructor } from "./sections/CupConstructor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Конструктор кубка – Linken's Sphere Esports" };

export default async function CupConstructorPage() {
  const user = await getSession();
  return (
    <PlatformShell user={user}>
      {user?.isAdmin ? <CupConstructor /> : <LoginScreen user={user} returnTo="/organizer/cup" />}
    </PlatformShell>
  );
}
