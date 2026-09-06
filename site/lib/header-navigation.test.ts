import type { MouseEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderNavigationLink } from "../app/components/header/HeaderNavigationLink";
import { measureNavigationAnimation } from "../app/components/header/navigation-animation-geometry";

afterEach(() => vi.unstubAllGlobals());

describe("header navigation", () => {
  it("starts the visual effect without preventing or deferring the link's navigation", () => {
    const beginNavigation = vi.fn();
    const onSelect = vi.fn();
    const link = HeaderNavigationLink({
      href: "/season", isActive: false, children: "Season", beginNavigation, onSelect,
    });
    const anchor = {} as HTMLAnchorElement;
    const preventDefault = vi.fn();
    link.props.onClick({ button: 0, currentTarget: anchor, preventDefault } as unknown as MouseEvent<HTMLAnchorElement>);

    expect(beginNavigation).toHaveBeenCalledWith(anchor);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(preventDefault).not.toHaveBeenCalled();
    expect(link.props.href).toBe("/season");
    expect(link.props.prefetch).toBe(false);
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])(
    "preserves the browser's modified click behavior: %j", (modifiers) => {
      const beginNavigation = vi.fn();
      const onSelect = vi.fn();
      const link = HeaderNavigationLink({ href: "/", isActive: true, children: "Home", beginNavigation, onSelect });
      link.props.onClick({ button: 0, ...modifiers } as unknown as MouseEvent<HTMLAnchorElement>);
      expect(beginNavigation).not.toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
      expect(link.props["aria-current"]).toBe("page");
    },
  );

  it.each([{ bottom: "-19px", height: "89px" }, { bottom: "0px", height: "70px" }])(
    "anchors the flame to the actual neon stripe: $bottom", ({ bottom, height }) => {
      const label = { getBoundingClientRect: () => ({ left: 120, top: 40, width: 60 }) };
      const link = {
        getBoundingClientRect: () => ({ left: 100, top: 17, width: 120, height: 71 }),
        querySelector: () => label,
      } as unknown as HTMLAnchorElement;
      vi.stubGlobal("getComputedStyle", (_element: unknown, pseudo?: string) => pseudo ? { bottom } : {
        font: "700 17px Arial", letterSpacing: "normal", borderBottomWidth: "1px", textAlign: "start", whiteSpace: "normal",
        getPropertyValue: () => "#79ddff",
      });
      const style = measureNavigationAnimation(link);
      expect(style.height).toBe(height);
      expect(style.top).toBe("17px");
      expect(style["--navigation-label-top"]).toBe("23px");
      expect(style["--navigation-label-left"]).toBe("20px");
      expect(style["--navigation-label-width"]).toBe("60px");
      expect(style.whiteSpace).toBe("normal");
    },
  );
});
