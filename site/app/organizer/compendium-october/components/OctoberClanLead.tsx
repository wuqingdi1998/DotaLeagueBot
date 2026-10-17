import { OctoberClanLeadView } from "./OctoberClanLeadView";
import { OctoberClanActivity } from "./OctoberClanActivity";
import { OCTOBER_CLANS } from "../model/clans";
import type { OctoberClanMember } from "../model/clan-members";

export function OctoberClanLead({ members }: { members: readonly OctoberClanMember[] }) {
  return <OctoberClanLeadView members={members}
    leftActivity={<OctoberClanActivity clan={OCTOBER_CLANS[0]} side="left" />}
    rightActivity={<OctoberClanActivity clan={OCTOBER_CLANS[1]} side="right" />} />;
}
