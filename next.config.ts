import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Webpack from bundling native Node.js modules used by the DB and Redis
  // adapters. These must run in the Node.js runtime, not the Edge runtime.
  serverExternalPackages: ['pg', 'ioredis', '@prisma/adapter-pg'],
};

export default nextConfig;
