import type { Metadata } from "next";
import { LoginScreen } from "@/app/auth/components/LoginScreen";
import { PlatformShell } from "@/app/tournaments/TournamentsHub";
import { getSession } from "@/lib/auth";
import { cleanDiscordRedirect } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вход — Linken's Sphere Esports",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, query] = await Promise.all([getSession(), searchParams]);
  const returnTo = cleanDiscordRedirect(
    typeof query.returnTo === "string" ? query.returnTo : "/",
  );
  return (
    <PlatformShell user={user}>
      <LoginScreen
        user={user}
        returnTo={returnTo}
        passwordChanged={query.passwordChanged === "1"}
      />
    </PlatformShell>
  );
}
