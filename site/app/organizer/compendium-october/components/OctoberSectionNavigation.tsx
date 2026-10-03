"use client";

import { useEffect, useState } from "react";
import { OCTOBER_PREVIEW_SECTIONS } from "../model/sections";

export function OctoberSectionNavigation() {
  const [activeId, setActiveId] = useState<string>(OCTOBER_PREVIEW_SECTIONS[0].id);

  useEffect(() => {
    const scrollRoot = document.getElementById("october-compendium-scroll");
    if (!scrollRoot) return;

    const sections = OCTOBER_PREVIEW_SECTIONS.flatMap((section) => {
      const element = document.getElementById(section.id);
      return element ? [{ id: section.id, element }] : [];
    });
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visibleEntry) setActiveId(visibleEntry.target.id);
      },
      { root: scrollRoot, threshold: [0.5, 0.75] },
    );
    sections.forEach(({ element }) => observer.observe(element));

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const currentScrollRoot = document.getElementById("october-compendium-scroll");
      if (!currentScrollRoot) return;
      const target = event.target;
      if (
        target instanceof HTMLElement
        && (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName))
      ) return;

      const currentIndex = Math.round(currentScrollRoot.scrollTop / currentScrollRoot.clientHeight);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), sections.length - 1);
      const nextSection = sections[nextIndex];
      if (!nextSection || nextIndex === currentIndex) return;
      event.preventDefault();
      currentScrollRoot.scrollTo({ top: nextSection.element.offsetTop, behavior: "smooth" });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
