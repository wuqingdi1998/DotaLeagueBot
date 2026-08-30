import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { OrganizerArchive } from "./sections/OrganizerArchive";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Архив организатора — Linken's Sphere Esports",
};

export default async function OrganizerPage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();

  return (
    <PlatformShell user={user}>
      <OrganizerArchive />
    </PlatformShell>
  );
}
