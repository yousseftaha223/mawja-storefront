/** @type {import('next').NextConfig} */
const RAW = "https://raw.githubusercontent.com/yousseftaha223/mawja-storefront/main/public";
export default {
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  // Fallback only: files in /public are served first. If a deployment was uploaded without the
  // binary assets, /demo and /brand images are proxied from the GitHub repo instead.
  async rewrites() {
    return {
      fallback: [
        { source: "/demo/:path*", destination: `${RAW}/demo/:path*` },
        { source: "/brand/:path*", destination: `${RAW}/brand/:path*` },
      ],
    };
  },
};
