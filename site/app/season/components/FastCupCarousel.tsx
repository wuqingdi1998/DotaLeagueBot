"use client";

import { type ReactNode, useEffect, useRef } from "react";

type FastCupCarouselProps = {
  children: ReactNode;
  targetIndex: number;
};

export function FastCupCarousel({
  children,
  targetIndex,
}: FastCupCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    const mobileViewport = window.matchMedia("(max-width: 760px)");
    const centerTarget = () => {
      if (!mobileViewport.matches) return;
      const target = container.children.item(targetIndex) as HTMLElement | null;
      if (!target) return;

      container.scrollTo({
        left:
          target.offsetLeft -
          (container.clientWidth - target.offsetWidth) / 2,
        behavior: "auto",
      });
    };

    const animationFrame = window.requestAnimationFrame(centerTarget);
    mobileViewport.addEventListener("change", centerTarget);
    window.addEventListener("resize", centerTarget);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      mobileViewport.removeEventListener("change", centerTarget);
      window.removeEventListener("resize", centerTarget);
    };
  }, [targetIndex]);

  return (
    <div
      ref={carouselRef}
      className="fast-cups-grid"
      role="region"
      aria-label="Турниры Fastcup"
    >
      {children}
    </div>
  );
}
