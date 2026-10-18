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
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // File previews (PDF, images) are shown in a frame on our own Documents page only.
      { source: '/api/v1/documents/files/:id/content', headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }, { key: 'Content-Security-Policy', value: "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'" }] },
    ];
  },
};

export default nextConfig;
