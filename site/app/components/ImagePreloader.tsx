"use client";

import { useEffect } from "react";

type PreloadStartMode = "idle" | "immediate";

function preloadImage(imageUrl: string) {
  return new Promise<void>((resolve) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = imageUrl;
  });
}

export function ImagePreloader({
  imageUrls,
  concurrency = 4,
  startMode = "idle",
}: {
  imageUrls: readonly string[];
  concurrency?: number;
  startMode?: PreloadStartMode;
}) {
  useEffect(() => {
    let isCancelled = false;
    let nextImageIndex = 0;

    async function preloadNextImages() {
      while (!isCancelled && nextImageIndex < imageUrls.length) {
        const imageUrl = imageUrls[nextImageIndex];
        nextImageIndex += 1;
        await preloadImage(imageUrl);
      }
    }

    function startPreload() {
      void Promise.all(Array.from(
        { length: concurrency },
        () => preloadNextImages(),
      ));
    }

    if (startMode === "immediate") {
      startPreload();
      return;
    }

    const idleCallback = window.requestIdleCallback?.(
      startPreload,
      { timeout: 2_000 },
    );
    const fallbackTimer = idleCallback === undefined
      ? window.setTimeout(startPreload, 1_000)
      : null;

    return () => {
      isCancelled = true;
      if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback);
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    };
  }, [concurrency, imageUrls, startMode]);

  return null;
}
