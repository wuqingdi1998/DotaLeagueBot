import { PlayerProfileServiceLogo } from "@/app/components/PlayerProfileServiceLogo";

export function DraftProfileServiceLogo({
  service,
}: {
  service: "stratz" | "dotabuff";
}) {
  return (
    <PlayerProfileServiceLogo
      className="fearless-lobby-service-logo"
      service={service}
    />
  );
}
