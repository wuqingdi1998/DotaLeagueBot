import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { LocalTimeHints } from "./components/LocalTimeHints";
import { PreventSpaceScroll } from "./components/PreventSpaceScroll";
import { SiteBreakWatcher } from "./components/SiteBreakWatcher";
import { HeaderNavigationAnimation } from "./components/header/HeaderNavigationAnimation";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const configuredBase = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, "");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const requestHost = forwardedHost ?? requestHeaders.get("host");
  const safeHost =
    requestHost && /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(requestHost)
      ? requestHost
      : "localhost:3000";
  const protocol =
    safeHost.startsWith("localhost") || safeHost.startsWith("127.0.0.1")
      ? "http"
      : "https";
  const metadataBase = new URL(configuredBase ?? `${protocol}://${safeHost}`);
  const title = "Linken's Sphere Esports";
  const description = "Турниры и события Dota-сообщества Linken's Sphere Esports.";

  return {
    metadataBase,
    title,
    description,
    icons: {
      icon: "/linkens-sphere-logo.png",
      shortcut: "/linkens-sphere-logo.png",
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: new URL("/og.png", metadataBase).toString(), width: 1734, height: 907 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/og.png", metadataBase).toString()],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <LocalTimeHints />
        <PreventSpaceScroll />
        <SiteBreakWatcher />
        <HeaderNavigationAnimation>{children}</HeaderNavigationAnimation>
      </body>
    </html>
  );
}
