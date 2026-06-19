import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. A stray package-lock.json in the
  // home directory otherwise makes Next infer the wrong root.
  turbopack: {
    root: __dirname,
  },
  // firebase-admin (used by the crawler API routes) does dynamic requires that
  // shouldn't be bundled — load it from node_modules at runtime instead.
  serverExternalPackages: ["firebase-admin"],
  images: {
    // Feed thumbnails come from arbitrary blog/YouTube hosts. We render them with
    // plain <img> (not next/image) so no remotePatterns allow-list is required.
    unoptimized: true,
  },
};

export default nextConfig;
