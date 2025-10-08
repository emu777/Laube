/** @type {import('next').Config} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storageの画像用
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [
            {
              protocol: 'https',
              hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
              port: '',
              pathname: '/storage/v1/object/public/avatars/**',
            },
          ]
        : []),
      // Xserverの画像用
      {
        protocol: 'https',
        hostname: 'sykos.laube.work', // あなたのXserverのドメイン名
      },
    ],
  },
};

module.exports = nextConfig;
