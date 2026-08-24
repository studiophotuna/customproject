import type { NextConfig } from "next";

// `||` (not `??`): platforms may inject an unset var as an empty string.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://edlhmlwsjcawramjxpuu.supabase.co";
const supabaseHost = new URL(supabaseUrl).hostname;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
