import { createRoot } from "react-dom/client";
import { SeasonStandingsPanel } from "@/app/tournaments/[slug]/sections/SeasonStandingsPanel";

createRoot(document.getElementById("root")!).render(
  <main className="site-shell" data-theme="dark">
    <div style={{ maxWidth: 1540, margin: "0 auto", padding: "20px clamp(16px,3vw,36px)" }}>
      <button type="button" id="outside">Внешняя кнопка</button>
      <SeasonStandingsPanel />
    </div>
  </main>,
);
