"use client";

import { useEffect, useState } from "react";
import { OCTOBER_PREVIEW_SECTIONS } from "../model/sections";

const WHEEL_PAGE_THRESHOLD = 24;
const PAGE_TRANSITION_LOCK_MS = 650;
const DESKTOP_PAGING_QUERY = "(min-width: 961px) and (min-height: 700px)";

export function OctoberSectionNavigation() {
  const [activeId, setActiveId] = useState<string>(OCTOBER_PREVIEW_SECTIONS[0].id);

  useEffect(() => {
    const scrollRoot = document.getElementById("october-compendium-scroll");
    if (!scrollRoot) return;
    const currentScrollRoot = scrollRoot;
    const desktopPaging = window.matchMedia(DESKTOP_PAGING_QUERY);

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

    let accumulatedWheelDelta = 0;
    let isPageTransitionLocked = false;
    let pageTransitionTimer: number | undefined;

    function currentSectionIndex() {
      return sections.reduce((closestIndex, section, index) => {
        const closestDistance = Math.abs(
          sections[closestIndex].element.offsetTop - currentScrollRoot.scrollTop,
        );
        const candidateDistance = Math.abs(section.element.offsetTop - currentScrollRoot.scrollTop);
        return candidateDistance < closestDistance ? index : closestIndex;
      }, 0);
    }

    function openAdjacentSection(direction: -1 | 1) {
      const currentIndex = currentSectionIndex();
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), sections.length - 1);
      const nextSection = sections[nextIndex];
      if (!nextSection || nextIndex === currentIndex) return false;

      setActiveId(nextSection.id);
      currentScrollRoot.scrollTo({ top: nextSection.element.offsetTop, behavior: "smooth" });
      window.history.replaceState(null, "", `#${nextSection.id}`);
      return true;
    }

    function isCompendiumDialogOpen() {
      return document.querySelector(".october-clan-standing-dialog[open]") !== null;
    }

    function handleWheel(event: WheelEvent) {
      if (isCompendiumDialogOpen()) return;
      if (
        !desktopPaging.matches
        || event.ctrlKey
        || Math.abs(event.deltaY) <= Math.abs(event.deltaX)
      ) return;
      event.preventDefault();
      if (isPageTransitionLocked) return;

      accumulatedWheelDelta += event.deltaY;
      if (Math.abs(accumulatedWheelDelta) < WHEEL_PAGE_THRESHOLD) return;

      const direction = accumulatedWheelDelta > 0 ? 1 : -1;
      accumulatedWheelDelta = 0;
      if (!openAdjacentSection(direction)) return;

      isPageTransitionLocked = true;
      pageTransitionTimer = window.setTimeout(() => {
        isPageTransitionLocked = false;
      }, PAGE_TRANSITION_LOCK_MS);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isCompendiumDialogOpen()) return;
      if (
        !desktopPaging.matches
        || (event.key !== "ArrowDown" && event.key !== "ArrowUp")
      ) return;
      const target = event.target;
      if (
        target instanceof HTMLElement
        && (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName))
      ) return;

      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!openAdjacentSection(direction)) return;
      event.preventDefault();
    }

    currentScrollRoot.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      observer.disconnect();
      if (pageTransitionTimer !== undefined) window.clearTimeout(pageTransitionTimer);
      currentScrollRoot.removeEventListener("wheel", handleWheel);
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
