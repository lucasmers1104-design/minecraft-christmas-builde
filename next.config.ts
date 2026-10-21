import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // prismarine-nbt is only used by server routes; keep it out of the bundler.
  serverExternalPackages: ['prismarine-nbt'],
};

export default nextConfig;
