import { createBrowserClient } from '@supabase/ssr';
import { AppProps } from 'next/app';
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import { Noto_Sans_JP, M_PLUS_1 } from 'next/font/google';
import PageLoader from '@/components/PageLoader';
import { NotificationProvider } from '@/contexts/NotificationContext';
import PullToRefresh from '@/components/PullToRefresh';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import '@/styles/globals.css';

const notoSansJP = Noto_Sans_JP({
  weight: ['400', '700'], // 使用するフォントの太さを指定
  subsets: ['latin'], // サブセットを指定（通常はlatinでOK）
  display: 'swap',
});

const mplus1 = M_PLUS_1({
  weight: '700', // 見出し用に太字を指定
  subsets: ['latin'],
  display: 'swap',
});

// Supabaseクライアントをコンポーネントの外で一度だけ生成する
const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SupabaseContext = createContext<SupabaseClient | null>(null);

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === null) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export default function MyApp({
  Component,
  pageProps,
}: AppProps<{
  initialSession: Session | null;
}>) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 認証状態の変更を監視し、変更があればページをリフレッシュする
  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      // メールアドレスでのログイン・新規登録が成功した場合、手動でリダイレクト
      if (event === 'SIGNED_IN' && session) {
        router.push('/');
      }
      // ログアウトは/logoutページで処理するため、ここでは何もしない
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleRefresh = useCallback(async () => {
    window.location.reload();
  }, []);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    // 5分ごとに最終アクティビティを更新
    const interval = setInterval(
      async () => {
        const {
          data: { user },
        } = await supabaseClient.auth.getUser();
        if (user) {
          await supabaseClient.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id);
        }
      },
      5 * 60 * 1000
    );

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
      clearInterval(interval);
    };
  }, [router]);

  return (
    <>
      <style jsx global>{`
        html {
          font-family: ${notoSansJP.style.fontFamily};
          --font-m-plus-1: ${mplus1.style.fontFamily};
        }
        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          font-family: var(--font-m-plus-1);
        }
      `}</style>
      <SupabaseContext.Provider value={supabaseClient}>
        <NotificationProvider>
          <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
            <Header />
            <main className="pt-20 pb-24">
              {loading ? (
                <PageLoader />
              ) : router.pathname.startsWith('/profile/') ||
                router.pathname.startsWith('/chat/') ||
                router.pathname === '/notifications' ? (
                <div className="h-full overflow-y-auto">{loading ? <PageLoader /> : <Component {...pageProps} />}</div>
              ) : (
                <PullToRefresh onRefresh={handleRefresh}>
                  <div className="pb-6">{loading ? <PageLoader /> : <Component {...pageProps} />}</div>
                </PullToRefresh>
              )}
            </main>
            {router.pathname.startsWith('/chat/') ? null : <BottomNav />}
          </div>
        </NotificationProvider>
      </SupabaseContext.Provider>
    </>
  );
}
