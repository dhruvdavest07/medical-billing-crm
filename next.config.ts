import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack for dev (default in Next 16)
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "radix-ui",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-popover",
      "@radix-ui/react-separator",
      "date-fns",
    ],
  },
};

export default nextConfig;
