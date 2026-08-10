import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.1.116"],
  serverExternalPackages: ["sharp", "pg", "pg-boss"],
};

export default nextConfig;
