import path from 'node:path';
import type { NextConfig } from 'next';

// Pin the project root: otherwise Next.js picks the folder of any package-lock.json found in a
// parent directory (e.g. a stray one in Downloads or the home folder) as the workspace root.
const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // prismarine-nbt is only used by server routes; keep it out of the bundler.
  serverExternalPackages: ['prismarine-nbt'],
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
