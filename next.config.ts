import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    dangerouslyAllowSVG: true,
    unoptimized: true,
  },
  serverExternalPackages: [
    "@ffmpeg-installer/ffmpeg",
    "@ffprobe-installer/ffprobe",
  ],
  experimental: {
    // Allow larger video uploads (up to 50MB) through middleware
    middlewareClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
