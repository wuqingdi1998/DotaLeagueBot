import { OctoberClanActivityView } from "@/app/organizer/compendium-october/components/OctoberClanActivityView";
import { useOctoberClanDialog } from "@/app/organizer/compendium-october/hooks/useOctoberClanDialog";
import { testClanActivity } from "../model/activity";
import type { TEST_CLANS } from "../model/presentation";
import type { TestState } from "../model/state";

export function TestClanActivity({ clan, side, state }: { clan: typeof TEST_CLANS[number]; side: "left" | "right"; state: TestState }) {
  const dialog = useOctoberClanDialog();
  return <OctoberClanActivityView clan={clan} side={side} {...dialog} activity={testClanActivity(state)} error={null} retry={() => {}} />;
}
