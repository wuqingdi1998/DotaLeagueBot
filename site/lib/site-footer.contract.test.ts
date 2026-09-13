import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const footerStyles = readFileSync(
  new URL("../app/styles/03-site-footer.css", import.meta.url),
  "utf8",
);
const platformShell = readFileSync(
  new URL("../app/tournaments/TournamentsHub.tsx", import.meta.url),
  "utf8",
);
const tournamentFooter = readFileSync(
  new URL(
    "../app/tournaments/[slug]/sections/TournamentFooter.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("site footer", () => {
  it("loads its shared styles on every route", () => {
    expect(globals).toContain('@import "./styles/03-site-footer.css";');
    expect(footerStyles).toMatch(
      /\.site-footer\s*\{[^}]*display:\s*flex;[^}]*min-height:\s*120px;/,
    );
  });

  it("uses the shared footer class in both public footer variants", () => {
    expect(platformShell).toContain(
      '<footer className="site-footer platform-footer">',
    );
    expect(tournamentFooter).toContain('<footer className="site-footer">');
  });

  it("keeps the platform footer at a stable height when page content shrinks", () => {
    expect(platformShell).toContain(
      'platform-shell${hasFooter ? " has-platform-footer" : ""}',
    );
    expect(footerStyles).toMatch(
      /\.platform-shell\.has-platform-footer\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/,
    );
    expect(footerStyles).toMatch(
      /\.platform-footer\s*\{[^}]*flex:\s*0 0 120px;[^}]*margin-top:\s*auto;/,
    );
  });

  it("keeps the footer usable on phones", () => {
    expect(footerStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.site-footer\s*\{[^}]*flex-direction:\s*column;/,
    );
    expect(footerStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.platform-footer-links\s*\{[^}]*flex-wrap:\s*wrap;/,
    );
    expect(footerStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.platform-footer\s*\{[^}]*flex-basis:\s*auto;/,
    );
  });
});
