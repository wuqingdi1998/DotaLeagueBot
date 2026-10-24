"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function CompendiumClosingRefresh({ isWaiting }: { isWaiting: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!isWaiting) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 30_000);
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [isWaiting, router]);
  return null;
}
