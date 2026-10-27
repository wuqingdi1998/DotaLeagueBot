import { redirect } from "next/navigation";
import { isDevelopmentSite } from "@/lib/development/environment";
import { cleanDiscordRedirect } from "@/lib/validation";
import { DevelopmentLoginScreen } from "@/app/components/development/DevelopmentLoginScreen";

export default async function DevelopmentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  if (!isDevelopmentSite()) redirect("/");
  const returnTo = cleanDiscordRedirect((await searchParams).returnTo ?? null);
  return <DevelopmentLoginScreen returnTo={returnTo} />;
}
