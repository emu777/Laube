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
  // ★★★ 修正点: rewrites設定を開発環境でのみ有効になるように修正 ★★★
  async rewrites() {
    // 本番環境ではrewritesは不要なため、空の配列を返す
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }

    // 開発環境でのみ、/api/へのリクエストをプロキシする
    return [
      {
        source: '/api/:path*',
        destination: 'https://api.laube777.com/:path*', // /api/の重複を避ける
      },
    ];
  },
};

module.exports = nextConfig;
