"use client";

import { useEffect } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

export function useHeroSearchHotkeys(
  searchInputRef: RefObject<HTMLInputElement | null>,
  setSearch: Dispatch<SetStateAction<string>>,
  onSearchLetter: () => void,
) {
  useEffect(() => {
    function sendLetterToSearch(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        target !== searchInputRef.current && (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLElement && target.isContentEditable
        )
      ) return;

      const letterMatch = event.code.match(/^Key([A-Z])$/);
      if (!letterMatch) return;

      event.preventDefault();
      onSearchLetter();
      const letter = letterMatch[1].toLowerCase();
      setSearch((currentSearch) => `${currentSearch}${letter}`);
      searchInputRef.current?.focus();
    }

    window.addEventListener("keydown", sendLetterToSearch);
    return () => window.removeEventListener("keydown", sendLetterToSearch);
  }, [onSearchLetter, searchInputRef, setSearch]);
}
