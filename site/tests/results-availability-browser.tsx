import React from "react";
import { createRoot } from "react-dom/client";
import { ResultsAvailabilityCountdown } from "@/app/compendium/components/ResultsAvailabilityCountdown";
import { OCTOBER_RESULTS_ARCHIVE_AT } from "@/lib/october-compendium-schedule";

const isExpiring = new URLSearchParams(window.location.search).get("mode") === "expires";
createRoot(document.getElementById("root")!).render(
  <div className="site-shell" data-theme="dark">
    <main className="compendium-results-page compendium-results-page--compact">
      <section className="compendium-results-hero">
        <div className="compendium-results-hero-copy">
          <div className="compendium-results-heading-meta">
            <span className="compendium-results-eyebrow">СЕЗОН 9 · 5–25 ОКТЯБРЯ 2026</span>
            <ResultsAvailabilityCountdown serverNow={isExpiring ? "2026-10-31T20:59:58+03:00" : "2026-10-28T21:00:00+03:00"}
              archiveAt={OCTOBER_RESULTS_ARCHIVE_AT} archiveHref="/archived-results" />
          </div>
          <h1>Результаты Компендиума</h1>
          <p>Компендиум завершён.</p>
        </div>
      </section>
    </main>
  </div>,
);
