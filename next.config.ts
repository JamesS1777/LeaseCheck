import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // proxy.ts buffers request bodies (default 10 MB). Leave room for a
    // 10 MB lease photo plus form overhead (see MAX_BYTES in lib/fileCheck.ts).
    proxyClientMaxBodySize: "12mb",
  },
};

export default nextConfig;
