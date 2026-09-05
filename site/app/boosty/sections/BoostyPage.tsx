import type { AuthUser } from "@/lib/auth";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { BoostyBenefits } from "../components/BoostyBenefits";
import { BoostyHero } from "../components/BoostyHero";
import type { SupporterDirectory } from "../services/supporters";

export function BoostyPage({
  directory,
  user,
}: {
  directory: SupporterDirectory;
  user: AuthUser | null;
}) {
  return (
    <PlatformShell user={user}>
      <BoostyHero directory={directory} />
      <BoostyBenefits />
    </PlatformShell>
  );
}
