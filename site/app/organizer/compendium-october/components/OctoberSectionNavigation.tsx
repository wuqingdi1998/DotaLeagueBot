"use client";

import { useState } from "react";
import { OCTOBER_PREVIEW_SECTIONS } from "../model/sections";

export function OctoberSectionNavigation() {
  const [activeId, setActiveId] = useState<string>(OCTOBER_PREVIEW_SECTIONS[0].id);

  function openSection(sectionId: string) {
    const scrollRoot = document.getElementById("october-compendium-scroll");
    const section = document.getElementById(sectionId);
    if (!scrollRoot || !section) return;
    setActiveId(sectionId);
    scrollRoot.scrollTo({ top: section.offsetTop, behavior: "smooth" });
    window.history.replaceState(null, "", `#${sectionId}`);
  }

  return (
    <nav className="october-section-navigation" aria-label="Разделы компендиума">
      {OCTOBER_PREVIEW_SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-label={section.label}
          aria-current={activeId === section.id ? "step" : undefined}
          title={section.label}
          onClick={(event) => {
            event.preventDefault();
            openSection(section.id);
          }}
        />
      ))}
    </nav>
  );
}
