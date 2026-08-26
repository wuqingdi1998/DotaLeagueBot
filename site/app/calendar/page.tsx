import type { Metadata } from "next";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { SeasonCalendarPage } from "./sections/SeasonCalendarPage";
import { listSeasonCalendarEvents } from "./services/calendar-events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Календарь 9-го сезона — Linken's Sphere Esports",
  description: "События 9-го сезона Linken's Sphere League с сентября по декабрь 2026 года.",
};

export default async function CalendarPage() {
  const [user, events] = await Promise.all([
    getSession(),
    listSeasonCalendarEvents(),
  ]);
  return (
    <PlatformShell user={user}>
      <SeasonCalendarPage initialEvents={events} isOrganizer={Boolean(user?.isAdmin)} />
    </PlatformShell>
  );
}
