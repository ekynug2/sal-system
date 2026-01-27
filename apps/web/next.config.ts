import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Disable server external packages check for mysql2 and bcryptjs
  serverExternalPackages: ['mysql2', 'bcryptjs'],

  // Set turbopack root to prevent workspace inference issues
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
