/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/wallet/:address/report.pdf',
        destination: '/api/wallet/:address/report',
      },
    ];
  },
};

module.exports = nextConfig;
