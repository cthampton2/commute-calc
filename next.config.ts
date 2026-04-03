import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack(config) {
    config.context = path.resolve(__dirname);
    return config;
  },
};

export default nextConfig;
