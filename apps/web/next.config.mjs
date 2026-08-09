/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The workspace packages ship TypeScript source, so Next compiles them
  // with the app rather than expecting a prebuilt dist.
  transpilePackages: ["@buzz/ui", "@buzz/core", "@buzz/db"],
  experimental: {
    // postgres-js is a native-ish driver; keep it external to the RSC bundle.
    serverActions: { bodySizeLimit: "4mb" },
  },
  serverExternalPackages: ["postgres", "bcryptjs"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
