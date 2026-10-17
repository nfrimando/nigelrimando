import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/reports.ts reads these with fs; ISR routes (e.g. the homepage stream)
  // re-run it inside the serverless function, where public/ isn't bundled by default.
  outputFileTracingIncludes: {
    "/*": ["./public/reports/*.html"],
  },
};

export default nextConfig;
