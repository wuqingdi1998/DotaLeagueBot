import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Local previews do not have Cloudflare's image/asset bindings.
    // Serve these small project-owned images directly.
    unoptimized: true,
  },
};

export default nextConfig;
