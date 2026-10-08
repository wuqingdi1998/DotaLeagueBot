import { afterEach, describe, expect, it, vi } from "vitest";
import { CompendiumToast } from "./CompendiumToast";

const portal = vi.hoisted(() => vi.fn((content, target) => ({ content, target })));
vi.mock("react-dom", () => ({ createPortal: portal }));

afterEach(() => {
  portal.mockClear();
  vi.unstubAllGlobals();
});

describe("compendium floating notifications", () => {
  it("does not access the browser while no notification is shown", () => {
    expect(CompendiumToast({ message: "" })).toBeNull();
    expect(portal).not.toHaveBeenCalled();
  });

  it("places the notification outside scrollable cards and retains the theme", () => {
    const shell = {};
    const querySelector = vi.fn().mockReturnValue(shell);
    vi.stubGlobal("document", { querySelector, body: {} });
    CompendiumToast({ message: "OpenDota временно недоступен" });
    expect(querySelector).toHaveBeenCalledWith(".site-shell");
    expect(portal).toHaveBeenCalledWith(expect.objectContaining({ props: {
      className: "compendium-toast", role: "status", children: "OpenDota временно недоступен",
    } }), shell);
  });

  it("also supports screens without the platform shell", () => {
    const body = {};
    vi.stubGlobal("document", { querySelector: () => null, body });
    CompendiumToast({ message: "Готово" });
    expect(portal.mock.calls[0][1]).toBe(body);
  });
});
