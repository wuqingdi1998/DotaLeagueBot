"use client";

import type { OCTOBER_CLANS } from "../model/clans";
import { useClanActivity } from "../hooks/useClanActivity";
import { useOctoberClanDialog } from "../hooks/useOctoberClanDialog";
import { OctoberClanActivityView } from "./OctoberClanActivityView";
export { OctoberClanActivityTable } from "./OctoberClanActivityView";

export function OctoberClanActivity({ clan, side }: { clan: typeof OCTOBER_CLANS[number]; side: "left" | "right" }) {
  const dialog = useOctoberClanDialog();
  const data = useClanActivity(dialog.isDialogOpen);
  return <OctoberClanActivityView clan={clan} side={side} {...dialog} {...data} />;
}
