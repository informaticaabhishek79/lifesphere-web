import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Location is only requested when the user presses Get help and chooses to share it.
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=()' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Shared hosting caps how many processes this account may run at once. Next.js's build-time
  // page-data collection auto-detects CPU count and spawns one worker per CPU — on a container
  // that reports the HOST's full core count (not this account's actual quota), that means dozens
  // of workers and `EAGAIN` ("resource temporarily unavailable") when the OS refuses to spawn more.
  // Pinning this to 1 makes the build run page-data collection serially instead.
  experimental: {
    cpus: 1,
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // File previews (PDF, images) are shown in a frame on our own Documents page only.
      { source: '/api/v1/documents/files/:id/content', headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }, { key: 'Content-Security-Policy', value: "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'" }] },
    ];
  },
};

export default nextConfig;
