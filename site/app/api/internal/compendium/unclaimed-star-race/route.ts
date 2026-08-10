import { POST as checkUnclaimedChallenges } from "../unclaimed-challenges/route";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

export async function POST(request: Request) {
  return checkUnclaimedChallenges(request);
}
