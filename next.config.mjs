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
  register: true,
  skipWaiting: true,
  customWorkerDir: 'public/worker', // カスタムコードを配置するディレクトリを指定
  disable: process.env.NODE_ENV === 'development',
};

export default withPWA(pwaConfig)(nextConfig);
