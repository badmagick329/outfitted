import type { NextConfig } from "next";

const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: allowedDevOrigins?.length ? allowedDevOrigins : undefined,
  serverExternalPackages: ["sharp", "pg", "pg-boss"],
};

export default nextConfig;
