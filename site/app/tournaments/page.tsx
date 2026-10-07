import { TournamentsDirectory } from "./TournamentsHub";
import { getSession } from "@/lib/auth";

export default async function TournamentsPage() {
  return <TournamentsDirectory initialUser={await getSession()} />;
}
