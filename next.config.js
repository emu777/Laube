/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  unoptimized: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'ufncdfxyawpmotgywzeo.supabase.co',
      },
      // Xserverの画像用
      {
        protocol: 'https',
        hostname: 'laube777.com',
        pathname: '/avatars/images/**',
      },
      // 新しいAPIサブドメインの画像用
      {
        protocol: 'https',
        hostname: 'api.laube777.com',
        pathname: '/avatars/images/**',
      },
    ],
  },
};

module.exports = nextConfig;
