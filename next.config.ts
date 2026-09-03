import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // The parent user directory also contains a lockfile. Pinning the root keeps
  // Turbopack from scanning outside this application during builds.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
