import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. A stray package-lock.json in the
  // home directory otherwise makes Next infer the wrong root.
  turbopack: {
    root: __dirname,
  },
  // Server-only packages with dynamic requires that shouldn't be bundled —
  // loaded from node_modules at runtime. firebase-admin (crawler) and the article
  // reader's extraction/sanitization stack.
  serverExternalPackages: [
    "firebase-admin",
    "@extractus/article-extractor",
    "sanitize-html",
  ],
  images: {
    // Feed thumbnails come from arbitrary blog/YouTube hosts. We render them with
    // plain <img> (not next/image) so no remotePatterns allow-list is required.
    unoptimized: true,
  },
};

export default nextConfig;
