import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { BoostyPage } from "./sections/BoostyPage";
import { loadSupporterDirectory } from "./services/supporters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Boosty – Linken's Sphere Esports",
  description:
    "Уровни поддержки Boosty, преимущества подписки и суппортеры Linken's Sphere Esports.",
};

export default async function BoostyRoute() {
  const [directory, user] = await Promise.all([
    loadSupporterDirectory(),
    getSession(),
  ]);
  return <BoostyPage directory={directory} user={user} />;
}
