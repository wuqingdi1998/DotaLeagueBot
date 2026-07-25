import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const metadataBase = new URL(`${protocol}://${host}`);
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
      <body>{children}</body>
    </html>
  );
}
