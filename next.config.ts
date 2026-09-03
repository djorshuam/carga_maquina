import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone é para o Dockerfile; na Vercel quebra o tracing do build
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
};

export default nextConfig;
