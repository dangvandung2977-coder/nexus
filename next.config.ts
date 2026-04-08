import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "xjacjdyproefyysmnpvy.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: { serverActions: { bodySizeLimit: "10mb" } 
                  typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },},
};

export default nextConfig;
