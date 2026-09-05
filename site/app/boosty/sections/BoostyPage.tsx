import type { AuthUser } from "@/lib/auth";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { BoostyBenefits } from "../components/BoostyBenefits";
import { SupporterGallery } from "../components/SupporterGallery";
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
      <BoostyBenefits />
      <SupporterGallery directory={directory} />
    </PlatformShell>
  );
}
