import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Monorepo configuration: Set tracing root to parent directory
  // This fixes Turbopack Windows filesystem boundary issues
  outputFileTracingRoot: path.join(__dirname, '../'),
};

export default nextConfig;
