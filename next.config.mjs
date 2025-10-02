/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ufncdfxyawpmotgywzeo.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/avatars/**',
      },
    ],
  },
};

const pwaConfig = {
  dest: 'public',
  register: false, // Service Workerの自動登録を無効化
  skipWaiting: true,
};

export default withPWA(pwaConfig)(nextConfig);
