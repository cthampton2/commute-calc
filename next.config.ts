import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      tailwindcss: path.resolve(__dirname, "node_modules/tailwindcss"),
    },
  },
  webpack(config) {
    config.context = path.resolve(__dirname);
    return config;
  },
};

export default nextConfig;
