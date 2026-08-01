"use client";

import { useEffect } from "react";
import { COMPENDIUM_HERO_IMAGE_URLS } from "../model/heroes";

const preloadConcurrency = 4;

function preloadImage(imageUrl: string) {
  return new Promise<void>((resolve) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = imageUrl;
  });
}

export function CompendiumHeroImagePreloader() {
  useEffect(() => {
    let isCancelled = false;
    let nextImageIndex = 0;

    async function preloadNextImages() {
      while (!isCancelled && nextImageIndex < COMPENDIUM_HERO_IMAGE_URLS.length) {
        const imageUrl = COMPENDIUM_HERO_IMAGE_URLS[nextImageIndex];
        nextImageIndex += 1;
        await preloadImage(imageUrl);
      }
    }

    function startPreload() {
      void Promise.all(
        Array.from(
          { length: preloadConcurrency },
          () => preloadNextImages(),
        ),
      );
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
      if (idleCallback !== undefined) {
        window.cancelIdleCallback(idleCallback);
      }
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    };
  }, []);

  return null;
}
