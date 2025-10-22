/** @type {import('next').Config} */
const nextConfig = {
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
        pathname: '/**', // すべてのパスを許可
      },
    ],
  },
  // ★★★ 開発環境でのCORSエラーを回避するための設定 ★★★
  // ローカル開発環境(/api/...)へのリクエストを、XserverのAPIへ転送(プロキシ)します。
  // これにより、ブラウザは同一オリジンへのリクエストと認識するため、CORSエラーが発生しなくなります。
  ...(process.env.NODE_ENV === 'development'
    ? {
        async rewrites() {
          return [
            {
              source: '/api/:path*',
              // ★★★ 修正: localhostからのリクエストのみプロキシするよう限定 ★★★
              has: [
                {
                  type: 'host',
                  value: 'localhost',
                },
              ],
              destination: 'https://laube777.com/:path*',
            },
          ];
        },
      }
    : {}),
};

module.exports = nextConfig;
