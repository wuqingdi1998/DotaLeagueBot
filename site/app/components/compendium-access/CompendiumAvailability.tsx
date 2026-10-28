"use client";

import { createContext, useContext, type ReactNode } from "react";

const CompendiumAvailabilityContext = createContext(true);

export function CompendiumAvailabilityProvider({ isEnabled, children }: { isEnabled: boolean; children: ReactNode }) {
  return <CompendiumAvailabilityContext.Provider value={isEnabled}>{children}</CompendiumAvailabilityContext.Provider>;
}

export function useCompendiumAvailability(): boolean {
  return useContext(CompendiumAvailabilityContext);
}
