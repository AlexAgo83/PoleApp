import type { NextConfig } from "next";
import { allowedImageHosts } from "./lib/imageHosts";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: allowedImageHosts.map((hostname) => ({
      protocol: "https",
      hostname,
    })),
  },
  async redirects() {
    return [
      {
        source: "/app",
        destination: "/",
        permanent: true,
      },
      {
        source: "/app/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
