"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

/** Only the most recently clicked link may navigate when its animation finishes. */
export function useHeaderNavigation() {
  const router = useRouter();
  const latestRequest = useRef(0);

  return useCallback((href: string, onComplete?: () => void) => {
    const request = ++latestRequest.current;

    return () => {
      if (request !== latestRequest.current) return;
      latestRequest.current += 1;
      router.push(href);
      onComplete?.();
    };
  }, [router]);
}
