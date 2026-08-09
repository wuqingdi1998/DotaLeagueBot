import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isSiteBreakEnabled } from "@/lib/site-break";
import { OrganizerAccess } from "../tournaments/OrganizerAccess";

export const dynamic = "force-dynamic";

export default async function SiteBreakPage() {
  const [isBreakEnabled, user] = await Promise.all([
    isSiteBreakEnabled(),
    getSession(),
  ]);
  if (!isBreakEnabled || user?.isAdmin) redirect("/");

  return (
    <main className="site-break-screen">
      <section className="site-break-card">
        <Image
          src="/linkens-sphere-logo.png"
          alt="Логотип Linken's Sphere Esports"
          width={88}
          height={88}
          priority
          unoptimized
        />
        <span>Linken&apos;s Sphere Esports</span>
        <h1>Сайт ушёл на перерыв</h1>
        <p>
          Организатор временно закрыл доступ, чтобы исправить проблему.
          Пожалуйста, попробуйте зайти немного позже.
        </p>
        <OrganizerAccess user={user} manageHref="/" />
      </section>
    </main>
  );
}
