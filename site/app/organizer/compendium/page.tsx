import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OrganizerCompendiumPage() {
  const user = await getSession();
  if (!user?.isAdmin) notFound();
  redirect("/organizer/compendium/results");
}
