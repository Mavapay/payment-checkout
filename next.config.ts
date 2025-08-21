import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev", // allows all subdomains of r2.dev
      },
    ],
  },
};

export default nextConfig;
