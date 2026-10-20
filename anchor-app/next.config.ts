import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Files read at runtime with fs, which tracing cannot see: need data, venues,
  // published results, and the Qloo harness (backup route, run as a child process).
  outputFileTracingIncludes: {
    "/**/*": ["./data/derived/**/*", "./public/data/**/*", "./node_modules/@qloo/qloo-harness/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
