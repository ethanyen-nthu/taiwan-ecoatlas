import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  outputFileTracingIncludes: {
    "/api/atlas": ["./public/data/atlas/*.metadata.json"],
    "/api/atlas/*": [
      "./public/data/atlas/*.json",
      "./public/data/atlas/*.geojson",
      "./public/data/counties.geojson",
    ],
    "/culture/places/*": [
      "./public/data/atlas/culture.metadata.json",
      "./public/data/atlas/cultural-trails.json",
      "./public/data/atlas/villages.geojson",
      "./public/data/atlas/public-historic-trails.geojson",
    ],
    "/plants": ["./public/data/atlas/plants.index.json"],
    "/plants/*": ["./public/data/atlas/plants.index.json"],
    "/wildlife/species/*": [
      "./public/data/atlas/wildlife.species.json",
      "./public/data/atlas/wildlife.metadata.json",
      "./public/data/counties.geojson",
    ],
  },
  async headers() {
    return [
      {
        // The worker file must never be served from a cache, or a fix to it
        // would not reach anyone for days.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
