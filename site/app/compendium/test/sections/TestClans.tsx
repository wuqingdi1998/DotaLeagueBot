import { OctoberClanStandings } from "@/app/organizer/compendium-october/components/OctoberClanStandings";
import { OctoberClanPrizeBoardView } from "@/app/organizer/compendium-october/components/OctoberClanPrizeBoardView";
import { OctoberClanLeadView } from "@/app/organizer/compendium-october/components/OctoberClanLeadView";
import { OctoberStarEarningGuide } from "@/app/organizer/compendium-october/components/OctoberStarEarningGuide";
import { TEST_CLANS, TEST_PRIZES, testMembers } from "../model/presentation";
import { TEST_COMPENDIUM } from "../model/config";
import { TestClanActivity } from "../components/TestClanActivity";
import type { TestState } from "../model/state";

export function TestClans({ state }: { state: TestState }) {
  const members = testMembers(state);
  return <section className="october-clan-showcase" aria-label="Клановый зачёт теста">
    <OctoberClanPrizeBoardView prizes={TEST_PRIZES} guide={<OctoberStarEarningGuide />}
      lead={<OctoberClanLeadView members={members}
        leftActivity={<TestClanActivity clan={TEST_CLANS[0]} side="left" state={state} />}
        rightActivity={<TestClanActivity clan={TEST_CLANS[1]} side="right" state={state} />} />}
    />
    <div className="october-clan-lineup">{TEST_CLANS.map((clan, index) => <div className="october-clan-lineup-slot" key={clan.id}>
      {index > 0 && <span className="october-clan-versus" aria-hidden="true">VS</span>}
      <OctoberClanStandings clanId={clan.id} clanName={clan.name} clanEmblem={clan.emblem} members={members.filter((member) => member.clanId === clan.id)} viewerDiscordId={TEST_COMPENDIUM.playerId} />
    </div>)}</div>
  </section>;
}
