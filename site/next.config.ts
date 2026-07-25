import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    // Local previews do not have Cloudflare's image/asset bindings.
    // Serve these small project-owned images directly.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
    ],
  },
};

export default nextConfig;
