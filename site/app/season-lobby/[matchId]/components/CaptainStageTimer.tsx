"use client";

import { useEffect, useState } from "react";

export function CaptainStageTimer({
  deadlineAt,
  serverNow,
}: {
  deadlineAt: string | null;
  serverNow: string;
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!deadlineAt) return;
    const initialRemaining = Math.max(
      0,
      new Date(deadlineAt).getTime() - new Date(serverNow).getTime(),
    );
    const localDeadline = Date.now() + initialRemaining;
    const update = () => setRemainingSeconds(Math.max(
      0,
      Math.ceil((localDeadline - Date.now()) / 1_000),
    ));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [deadlineAt, serverNow]);

  return (
    <strong className="season-room-stage-timer" aria-live="polite">
      {remainingSeconds} сек.
    </strong>
  );
}
