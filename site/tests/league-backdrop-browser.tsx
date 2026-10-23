import { useState } from "react";
import { createRoot } from "react-dom/client";
import { LeagueBackdropPicker } from "@/app/tournaments/[slug]/admin/LeagueBackdropPreview";
import { LeagueBackdrop } from "@/app/tournaments/[slug]/components/LeagueBackdrop";
import { tournamentDirectoryBackdropId } from "@/app/tournaments/[slug]/model/league-backdrops";
import { LeagueExcelDownload } from "@/app/tournaments/[slug]/admin/LeagueExcelDownload";
function Preview() {
  const [isAdmin, setIsAdmin] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  return <main className={`site-shell league-backdrop-preview-shell`} data-theme="dark">
    <LeagueBackdrop organizerId={isAdmin ? "preview-organizer" : undefined} variantId={window.location.pathname === "/directory" ? tournamentDirectoryBackdropId : undefined} />
    <header style={{ height: 76, padding: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
      <button onClick={() => setIsAdmin(!isAdmin)}>Сменить доступ</button>
      <button onClick={() => setIsOpen(!isOpen)}>Профиль участника</button>
      {isAdmin && isOpen && <div className="player-profile-popover" style={{ position: "absolute", right: 20, top: 76, width: 320, background: "var(--surface)", padding: 16, zIndex: 2 }}>
        <LeagueBackdropPicker organizerId="preview-organizer" />
        <LeagueExcelDownload slug="test-league" title="Лига 9" />
      </div>}
    </header>
    <section style={{ maxWidth: 1100, margin: "120px auto", minHeight: 500, padding: 40, background: "var(--surface)", borderRadius: 24 }}>
      <h1>Лига · Сезон 9</h1><p>Обзор · Таблица · Туры · Правила</p>
      <h2>9-й тур</h2><p>25 октября 2026 · BO2</p>
    </section>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
