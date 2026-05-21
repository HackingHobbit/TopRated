import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests for dev resources so CSS/JS loads via proxy
  allowedDevOrigins: ['127.0.0.1', 'localhost', '::1'],
};

export default nextConfig;
