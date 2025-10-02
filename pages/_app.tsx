import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session, useUser } from '@supabase/auth-helpers-react';
import { AppProps } from 'next/app';
import { useSWRConfig } from 'swr';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Noto_Sans_JP, M_PLUS_1 } from 'next/font/google';
import PageLoader from '@/components/PageLoader';
import { NotificationProvider } from '@/contexts/NotificationContext';
import PullToRefresh from '@/components/PullToRefresh';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
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

export default function MyApp({
  Component,
  pageProps,
}: AppProps<{
  initialSession: Session;
}>) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());
  const user = useUser();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const handleRefresh = useCallback(async () => {
    // SWRのキャッシュを再検証する
    mutate((key) => true, undefined, { revalidate: true });
  }, [mutate]);

  useEffect(() => {
    if ('serviceWorker' in navigator && window.workbox !== undefined) {
      navigator.serviceWorker.ready
        .then((registration) => {
          console.log('Service Worker is ready.');
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
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
          data: { session },
        } = await supabaseClient.auth.getSession();
        if (session) {
          await supabaseClient
            .from('profiles')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', session.user.id);
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
  }, [router, supabaseClient]);

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
      <SessionContextProvider supabaseClient={supabaseClient} initialSession={pageProps.initialSession}>
        <NotificationProvider>
          <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
            <Header />
            <main className="pt-20 pb-24">
              {loading ? (
                <PageLoader />
              ) : router.pathname.startsWith('/profile/') ||
                router.pathname === '/chat' ||
                router.pathname === '/notifications' ? (
                <div className="h-full overflow-y-auto">{loading ? <PageLoader /> : <Component {...pageProps} />}</div>
              ) : (
                <PullToRefresh onRefresh={handleRefresh}>
                  <div className="pb-6">{loading ? <PageLoader /> : <Component {...pageProps} />}</div>
                </PullToRefresh>
              )}
            </main>
            {/* 相手とのチャット画面(`/chat/[id]`)でのみBottomNavを非表示 */}
            {router.pathname.startsWith('/chat/') ? null : <BottomNav />}
          </div>
        </NotificationProvider>
      </SessionContextProvider>
    </>
  );
}
