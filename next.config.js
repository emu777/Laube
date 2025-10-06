/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
      // If you are still using Xserver for new avatars, add its hostname here.
      // {
      //   protocol: 'https',
      //   hostname: 'your-xserver-domain.com',
      // },
    ],
  },
};

module.exports = nextConfig;
