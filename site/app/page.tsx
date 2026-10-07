import { CommunityHome } from "./tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  return <CommunityHome initialUser={await getSession()} />;
}
