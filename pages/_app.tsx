import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session, useUser } from '@supabase/auth-helpers-react';
import { AppProps } from 'next/app';
import { useSWRConfig } from 'swr';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Noto_Sans_JP, M_PLUS_1 } from 'next/font/google';
import PageLoader from '@/components/PageLoader';
import { NotificationProvider } from '../contexts/NotificationContext';
import PullToRefresh from 'react-simple-pull-to-refresh';
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

  const handleRefresh = useCallback(() => {
    // router.replace() の代わりに、SWRのキャッシュを再検証する
    // これにより、どのページでもその場でデータが更新され、意_app.tsxの意図しないページ遷移やレイアウト崩れがなくなる
    mutate((key) => true, undefined, { revalidate: true });
    return Promise.resolve();
  }, [mutate]);

  // プッシュ通知の購読処理
  useEffect(() => {
    const setupPushNotifications = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window && user) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');

          // 既に購読済みか確認
          let subscription = await registration.pushManager.getSubscription();

          if (!subscription) {
            // 購読していない場合は、許可を求めて購読する
            const permission = await window.Notification.requestPermission();
            if (permission !== 'granted') {
              console.log('Push notification permission not granted.');
              return;
            }

            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            });
          }

          // 購読情報をSupabaseに保存
          await supabaseClient
            .from('push_subscriptions')
            .upsert({ user_id: user.id, subscription: subscription }, { onConflict: 'user_id,subscription' });
        } catch (error) {
          console.error('Error setting up push notifications:', error);
        }
      }
    };

    if (user) {
      setupPushNotifications();
    }
  }, [user, supabaseClient]);

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
            <Header /> {/* `Header`と`BottomNav`はページコンポーネントの外で一度だけ描画します */}
            <main className="pt-20 pb-24">
              {loading ? (
                <PageLoader />
              ) : (
                <PullToRefresh onRefresh={handleRefresh} pullingContent="" refreshingContent={<PageLoader />}>
                  <Component {...pageProps} />
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
