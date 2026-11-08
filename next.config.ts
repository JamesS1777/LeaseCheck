import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // proxy.ts buffers request bodies (default 10 MB). Leave room for a
    // 15 MB lease (MAX_BYTES in app/api/check/route.ts) plus form overhead.
    proxyClientMaxBodySize: "16mb",
  },
};

export default nextConfig;
