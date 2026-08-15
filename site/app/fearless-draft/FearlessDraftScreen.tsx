"use client";

import { FiActivity, FiShield } from "react-icons/fi";
import type { FearlessDraftSnapshot } from "./model/snapshot";
import { useFearlessDraft } from "./hooks/useFearlessDraft";
import { useDraftFullscreen } from "./hooks/useDraftFullscreen";
import { ActiveDraft } from "./sections/ActiveDraft";
import { DraftChoices } from "./sections/DraftChoices";
import { DraftQueue } from "./sections/DraftQueue";
import { DraftAgreementPanel } from "./sections/DraftAgreementPanel";
import { DraftLocaleProvider, useDraftLocale } from "./hooks/useDraftLocale";
import { translateDraftError } from "./model/i18n";

export function FearlessDraftScreen({
  initialSnapshot,
}: {
  initialSnapshot: FearlessDraftSnapshot;
}) {
  return (
    <DraftLocaleProvider>
      <FearlessDraftContent initialSnapshot={initialSnapshot} />
    </DraftLocaleProvider>
  );
}

function FearlessDraftContent({
  initialSnapshot,
}: {
  initialSnapshot: FearlessDraftSnapshot;
}) {
  const { snapshot, error, isSending, isConnected, send } =
    useFearlessDraft(initialSnapshot);
  const { locale, text } = useDraftLocale();
  const {
    draftRef,
    isFullscreen,
    isFullscreenSupported,
    toggleFullscreen,
  } = useDraftFullscreen();
  const series = snapshot.series;
  return (
    <div className="fearless-draft-page" lang={locale}>
      <section className="fearless-draft-hero">
        <div>
          <span className="section-kicker">Linken&apos;s Sphere</span>
          <h1>Fearless Draft</h1>
          <p>{text.screenDescription}</p>
        </div>
        <div className={`fearless-realtime ${isConnected ? "online" : "reconnecting"}`}>
          {isConnected ? <FiActivity /> : <FiShield />}
          <span>{isConnected ? text.syncActive : text.reconnecting}</span>
        </div>
      </section>

      {error && (
        <div className="fearless-error" role="alert">
          {translateDraftError(error, locale)}
        </div>
      )}

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
      ) : (
        <section className="fearless-draft-stage" ref={draftRef}>
          {series.map.status === "FIRST_DECISION" || series.map.status === "SECOND_DECISION" ? (
            <DraftChoices
              key={series.map.id}
              series={series}
              userId={snapshot.user.id}
              serverNow={snapshot.serverNow}
              isSending={isSending}
              send={send}
              isFullscreen={isFullscreen}
              isFullscreenSupported={isFullscreenSupported}
              toggleFullscreen={toggleFullscreen}
            />
          ) : (
            <ActiveDraft
              series={series}
              userId={snapshot.user.id}
              serverNow={snapshot.serverNow}
              isSending={isSending}
              send={send}
              isFullscreen={isFullscreen}
              isFullscreenSupported={isFullscreenSupported}
              toggleFullscreen={toggleFullscreen}
            />
          )}
        </section>
      )}
    </div>
  );
}
