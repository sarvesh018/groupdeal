import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page here is per-user and reads live data, so the simpler
  // "render on each request" model is used instead of Cache Components.
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // Booking receipts and showroom documents are uploaded through forms (2 MB files).
    serverActions: { bodySizeLimit: "3mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
