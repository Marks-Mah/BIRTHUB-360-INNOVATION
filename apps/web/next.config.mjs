import path from "node:path";
import { fileURLToPath } from "node:url";

const nextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
const cspReportUri = process.env.CSP_REPORT_URI;
const cspReportOnly = (process.env.NEXT_PUBLIC_CSP_REPORT_ONLY ?? "true") === "true";
const immutableAssetCache = "public, max-age=31536000, immutable";
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  `connect-src 'self' ${nextPublicApiUrl} https://*.ingest.sentry.io ${posthogHost ?? ""}`,
  "font-src 'self' data:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  cspReportUri ? `report-uri ${cspReportUri}` : ""
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  {
    key: cspReportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy",
    value: contentSecurityPolicy
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  }
];

/** @type {import("next").NextConfig} */
const nextConfig = {
  compress: true,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  poweredByHeader: false,
  reactStrictMode: true,
  headers() {
    return Promise.resolve([
      {
        headers: [
          {
            key: "Cache-Control",
            value: immutableAssetCache
          }
        ],
        source: "/_next/static/(.*)"
      },
      {
        headers: [
          {
            key: "Cache-Control",
            value: immutableAssetCache
          }
        ],
        source: "/(.*\\.(?:avif|css|gif|ico|jpg|jpeg|js|mjs|otf|png|svg|ttf|webp|woff|woff2))"
      },
      {
        headers: securityHeaders,
        source: "/(.*)"
      }
    ]);
  }
};

export default nextConfig;
