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

const isDev = process.env.NODE_ENV === 'development';

const pwaConfig = {
  dest: 'public',
  register: true, // Service Workerの自動登録を有効化
  skipWaiting: true,
  disable: false, // 開発環境でもPWAを有効にする
  swSrc: 'public/sw.js', // カスタムService Workerのソースファイルを指定
};

export default withPWA(pwaConfig)(nextConfig);
