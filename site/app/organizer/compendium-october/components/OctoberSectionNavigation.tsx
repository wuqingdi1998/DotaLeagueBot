"use client";

import { useEffect, useState } from "react";
import { OCTOBER_PREVIEW_SECTIONS } from "../model/sections";

export function OctoberSectionNavigation() {
  const [activeId, setActiveId] = useState<string>(OCTOBER_PREVIEW_SECTIONS[0].id);

  useEffect(() => {
    const scrollRoot = document.getElementById("october-compendium-scroll");
    if (!scrollRoot) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { root: scrollRoot, threshold: [0.25, 0.5, 0.75] },
    );

    for (const section of OCTOBER_PREVIEW_SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav className="october-section-navigation" aria-label="Разделы компендиума">
      {OCTOBER_PREVIEW_SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-label={section.label}
          aria-current={activeId === section.id ? "step" : undefined}
          title={section.label}
          onClick={() => setActiveId(section.id)}
        />
      ))}
    </nav>
  );
}
