import type { TournamentStatus } from "@/lib/tournaments";
import { statusDetails } from "./tournament-hub-model";

export function TournamentStatusBadge({
  status,
  variant = "label",
}: {
  status: TournamentStatus;
  variant?: "label" | "short";
}) {
  return (
    <span className={`tournament-status ${status}`}>
      {status === "registration" && (
        <i className="tournament-status-pulse" aria-hidden="true" />
      )}
      {statusDetails[status][variant]}
    </span>
  );
}
