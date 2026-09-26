import Image from "next/image";
import { initials } from "../model/formatters";

type CompactTeamEmblemProps = {
  className: string;
  logoKey: string | null | undefined;
  teamName: string;
};

export function CompactTeamEmblem({
  className,
  logoKey,
  teamName,
}: CompactTeamEmblemProps) {
  if (logoKey) {
    return (
      <Image
        className={`compact-team-emblem ${className}`}
        src={`/api/team-emblems/${logoKey}`}
        alt={`Эмблема команды ${teamName}`}
        width={36}
        height={36}
        unoptimized
      />
    );
  }

  return <i aria-hidden="true">{initials(teamName)}</i>;
}
