import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { CompendiumAvailabilityProvider } from "./CompendiumAvailability";
import { OrganizerArchive } from "@/app/organizer/sections/OrganizerArchive";
import { CompendiumNavigationLink } from "../header/CompendiumNavigationLink";

afterEach(() => vi.useRealTimers());

it("removes the organizer's Compendium archive and navigation from development", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-28T12:00:00+03:00"));
  const content = <><OrganizerArchive /><CompendiumNavigationLink beginNavigation={() => {}} isActive={false} /></>;
  expect(renderToStaticMarkup(<CompendiumAvailabilityProvider isEnabled={false}>{content}</CompendiumAvailabilityProvider>)).toBe("");
  const live = renderToStaticMarkup(<CompendiumAvailabilityProvider isEnabled>{content}</CompendiumAvailabilityProvider>);
  expect(live).toContain("Компендиум №2");
  expect(live).toContain('href="/compendium"');
});

it("hides live navigation at the deadline and keeps archive number two available", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-31T21:00:00+03:00"));
  expect(renderToStaticMarkup(<CompendiumNavigationLink beginNavigation={() => {}} isActive={false} />)).toBe("");
  expect(renderToStaticMarkup(<OrganizerArchive />)).toContain("Компендиум №2");
});
