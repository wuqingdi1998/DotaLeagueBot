import { OctoberClanShowcaseView } from "@/app/organizer/compendium-october/sections/OctoberClanShowcaseView";
import { OctoberClanPrizeBoardView } from "@/app/organizer/compendium-october/components/OctoberClanPrizeBoardView";
import { OctoberClanLeadView } from "@/app/organizer/compendium-october/components/OctoberClanLeadView";
import { OctoberStarEarningGuide } from "@/app/organizer/compendium-october/components/OctoberStarEarningGuide";
import { TEST_CLANS, TEST_PRIZES, testMembers } from "../model/presentation";
import { TEST_COMPENDIUM } from "../model/config";
import { TestClanActivity } from "../components/TestClanActivity";
import type { TestState } from "../model/state";

export function TestClans({ state }: { state: TestState }) {
  const members = testMembers(state);
  return <OctoberClanShowcaseView members={members} clans={TEST_CLANS} viewerDiscordId={TEST_COMPENDIUM.playerId} prizeBoard={
    <OctoberClanPrizeBoardView prizes={TEST_PRIZES} guide={<OctoberStarEarningGuide />}
      lead={<OctoberClanLeadView members={members}
        leftActivity={<TestClanActivity clan={TEST_CLANS[0]} side="left" state={state} />}
        rightActivity={<TestClanActivity clan={TEST_CLANS[1]} side="right" state={state} />} />}
    />
  } />;
}
