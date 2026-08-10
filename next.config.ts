import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["localhost"],
  serverExternalPackages: ["sharp", "pg", "pg-boss"],
};

export default nextConfig;
