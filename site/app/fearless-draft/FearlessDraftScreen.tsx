"use client";

import { FiActivity, FiShield } from "react-icons/fi";
import type { FearlessDraftSnapshot } from "./model/snapshot";
import { useFearlessDraft } from "./hooks/useFearlessDraft";
import { ActiveDraft } from "./sections/ActiveDraft";
import { DraftChoices } from "./sections/DraftChoices";
import { DraftQueue } from "./sections/DraftQueue";
import { DraftAgreementPanel } from "./sections/DraftAgreementPanel";

export function FearlessDraftScreen({
  initialSnapshot,
}: {
  initialSnapshot: FearlessDraftSnapshot;
}) {
  const { snapshot, error, isSending, isConnected, send } =
    useFearlessDraft(initialSnapshot);
  const series = snapshot.series;
  return (
    <div className="fearless-draft-page">
      <section className="fearless-draft-hero">
        <div>
          <span className="section-kicker">Linken&apos;s Sphere</span>
          <h1>Fearless Draft</h1>
          <p>
            Полный Captain&apos;s Mode для двух участников. Герои, выбранные на
            прошлой карте, больше не возвращаются в текущую серию.
          </p>
        </div>
        <div className={`fearless-realtime ${isConnected ? "online" : "reconnecting"}`}>
          {isConnected ? <FiActivity /> : <FiShield />}
          <span>{isConnected ? "Синхронизация активна" : "Переподключение…"}</span>
        </div>
      </section>

      {error && <div className="fearless-error" role="alert">{error}</div>}

      {series && (
        <DraftAgreementPanel
          series={series}
          userId={snapshot.user.id}
          serverNow={snapshot.serverNow}
          isSending={isSending}
          send={send}
        />
      )}

      {!series ? (
        <DraftQueue snapshot={snapshot} isSending={isSending} send={send} />
      ) : series.map.status === "FIRST_DECISION" || series.map.status === "SECOND_DECISION" ? (
        <DraftChoices
          key={series.map.id}
          series={series}
          userId={snapshot.user.id}
          isSending={isSending}
          send={send}
        />
      ) : (
        <ActiveDraft
          series={series}
          userId={snapshot.user.id}
          serverNow={snapshot.serverNow}
          isSending={isSending}
          send={send}
        />
      )}
    </div>
  );
}
