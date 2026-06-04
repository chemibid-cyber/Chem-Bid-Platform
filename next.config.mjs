/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA assets (manifest, service worker) are served from /public.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
