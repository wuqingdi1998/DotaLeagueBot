"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function OctoberReleaseRefresh({
  nextTransitionAt,
}: {
  nextTransitionAt: string | null;
}) {
  const router = useRouter();
  useEffect(() => {
    if (!nextTransitionAt) return;
    const delay = Math.max(15_000, Date.parse(nextTransitionAt) - Date.now() + 250);
    const timer = window.setTimeout(() => router.refresh(), delay);
    return () => window.clearTimeout(timer);
  }, [nextTransitionAt, router]);
  return null;
}
