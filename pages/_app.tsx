import { createBrowserClient } from '@supabase/ssr';
import { AppProps } from 'next/app';
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import Head from 'next/head'; // Added for PWA theme-color and manifest
import { useRouter } from 'next/router';
import { Noto_Sans_JP, M_PLUS_1 } from 'next/font/google';
import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
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

// --- New NavigationGuardContext ---
type NavigationGuardFunction = (targetPath: string) => Promise<boolean>;

interface NavigationGuardContextType {
  registerNavigationGuard: (guard: NavigationGuardFunction) => void;
  unregisterNavigationGuard: () => void;
  triggerNavigationGuard: (targetPath: string) => Promise<boolean>;
}

export const NavigationGuardContext = createContext<NavigationGuardContextType | null>(null);

export const useNavigationGuard = () => {
  const context = useContext(NavigationGuardContext);
  if (context === null) {
    throw new Error('useNavigationGuard must be used within a NavigationGuardProvider');
  }
  return context;
};
// --- End New NavigationGuardContext ---

// react-pull-to-refresh は window オブジェクトに依存するため、クライアントサイドでのみ動的に読み込みます
const DynamicPullToRefresh = dynamic(() => import('react-pull-to-refresh'), {
  ssr: false,
});

export default function MyApp({
  Component,
  pageProps,
  router, // routerプロパティをpropsから受け取る
}: AppProps<{
  initialSession: Session | null;
}>) {
  const [currentNavigationGuard, setCurrentNavigationGuard] = useState<NavigationGuardFunction | null>(null);

  // 認証状態の変更を監視し、変更があればページをリフレッシュする (クライアントサイドでのみ実行)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // ログインが成功した場合、ページを完全にリロードしてトップに遷移
        // これにより、サーバーサイドで最新のセッション情報を使ってデータが再取得される
        window.location.assign('/');
      }
    });

    return () => subscription.unsubscribe();
  }, []); // このuseEffectはsupabaseClientに依存しますが、一度だけ実行されれば良いので空の依存配列でOK

  // NavigationGuardContext の実装
  const navigationGuardContextValue = {
    registerNavigationGuard: useCallback((guard: NavigationGuardFunction) => {
      setCurrentNavigationGuard(() => guard); // 関数を直接セット
    }, []),
    unregisterNavigationGuard: useCallback(() => {
      setCurrentNavigationGuard(null);
    }, []),
    triggerNavigationGuard: useCallback(
      async (targetPath: string) => {
        if (currentNavigationGuard) {
          return await currentNavigationGuard(targetPath);
        }
        return true; // ガードが登録されていなければ常に遷移を許可
      },
      [currentNavigationGuard]
    ),
  };

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
          <NavigationGuardContext.Provider value={navigationGuardContextValue}>
            {' '}
            {/* Add Provider here */}
            <AppContent Component={Component} pageProps={pageProps} router={router} />
          </NavigationGuardContext.Provider>{' '}
          {/* Close Provider here */}
        </NotificationProvider>
      </SupabaseContext.Provider>
    </>
  );
}

// UIのレンダリングとフックの呼び出しをこのコンポーネントに集約
const AppContent = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();
  const { unreadCount: unreadNotificationCount } = useNotifications();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  const handleRefresh = useCallback(async () => {
    window.location.reload();
  }, []);

  // プルリフレッシュを無効化するページのパスを定義
  const noPullToRefreshPaths = ['/profile/', '/chat/', '/notifications', '/account', '/settings', '/login', '/logout'];
  // 現在のパスが上記リストのいずれかで始まるかチェック
  const usePullToRefresh = !noPullToRefreshPaths.some((path) => router.pathname.startsWith(path));

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
      <Header />
      <main className="pt-20 pb-24">
        {usePullToRefresh ? (
          <DynamicPullToRefresh onRefresh={handleRefresh}>
            {loading ? <PageLoader /> : <Component {...pageProps} />}
          </DynamicPullToRefresh>
        ) : loading ? (
          <PageLoader />
        ) : (
          <Component {...pageProps} />
        )}
      </main>
      {router.pathname.startsWith('/chat/') ? null : <BottomNav unreadNotificationCount={unreadNotificationCount} />}
    </div>
  );
};
