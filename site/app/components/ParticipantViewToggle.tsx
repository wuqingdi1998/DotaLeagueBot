"use client";

import { setParticipantViewCookie } from "@/lib/participant-view-browser";

export function ParticipantViewToggle({ isEnabled }: { isEnabled: boolean }) {
  return (
    <label className="participant-view-toggle">
      <input
        type="checkbox"
        checked={isEnabled}
        onChange={(event) => {
          const nextIsEnabled = event.target.checked;
          setParticipantViewCookie(nextIsEnabled);
          if (nextIsEnabled) {
            window.location.assign("/");
          } else {
            window.location.reload();
          }
        }}
      />
      <span>
        <strong>От лица участника</strong>
        <small>Скрыть доступ организатора в этом просмотре</small>
      </span>
    </label>
  );
}
