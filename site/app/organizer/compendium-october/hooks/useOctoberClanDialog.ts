"use client";

import { useEffect, useRef, useState } from "react";

export function useOctoberClanDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  useEffect(() => {
    if (!isDialogOpen) return;
    const previousOverflow = document.body.style.overflow;
    const container = dialogRef.current?.closest<HTMLElement>(".october-compendium-preview");
    const previousContainerOverflow = container?.style.overflowY;
    document.body.style.overflow = "hidden";
    if (container) container.style.overflowY = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (container) container.style.overflowY = previousContainerOverflow ?? "";
    };
  }, [isDialogOpen]);
  function openDialog() { dialogRef.current?.showModal(); setIsDialogOpen(true); }
  function closeDialog() { dialogRef.current?.close(); setIsDialogOpen(false); }
  function onDialogClose() { setIsDialogOpen(false); }
  return { dialogRef, isDialogOpen, openDialog, closeDialog, onDialogClose };
}
