import { createBrowserClient } from '@supabase/ssr';
import { AppProps } from 'next/app';
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import Head from 'next/head'; // Added for PWA theme-color and manifest
import { useRouter } from 'next/router';
import { Noto_Sans_JP, M_PLUS_1 } from 'next/font/google';
import { useSWRConfig } from 'swr';
import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast'; // react-hot-toastをインポート
import PageLoader from '@/components/PageLoader';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import SupabaseContext from '@/contexts/SupabaseContext';
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
  // リクエストごとに新しいSupabaseクライアントを生成する
  const [supabaseClient] = useState(() =>
    createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  );
  const { cache, mutate } = useSWRConfig();
  const [currentNavigationGuard, setCurrentNavigationGuard] = useState<NavigationGuardFunction | null>(null);

  // 認証状態の変更を監視し、変更があればページをリフレッシュする (クライアントサイドでのみ実行)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      // Google認証などのOAuthプロバイダからのリダイレクト後、
      // URLのハッシュ(#)にアクセストークンが含まれている場合にSIGNED_INイベントが発生します。
      // このタイミングで一度だけトップページに遷移させ、URLからハッシュを消去します。
      // window.location.assign('/') を使うと無限リロードの原因になることがあるため、
      // router.push('/') を使用します。
      if (event === 'SIGNED_IN') {
        // Google認証からのリダイレクト直後（URLにaccess_tokenがある）はページをリロードしてセッションを確実に同期
        if (window.location.hash.includes('access_token')) {
          window.location.reload();
        } else {
          // メール認証後などは現在のページを再取得して同期
          router.replace(router.asPath);
        }
      } else if (event === 'SIGNED_OUT') {
        // ログアウト時もページの再取得を行い、ログインページへリダイレクトさせる
        router.replace(router.asPath);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabaseClient, router]); // 依存配列を修正

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
            <Toaster /> {/* Toasterコンポーネントを追加 */}
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
  const noPullToRefreshPaths = ['/chat/', '/notifications', '/account', '/settings', '/login', '/logout'];
  // 現在のパスが上記リストのいずれかで始まるかチェック
  // `/profile/[id]` のような動的なパスも無効化の対象に含める
  const usePullToRefresh =
    !noPullToRefreshPaths.some((path) => router.pathname.startsWith(path)) && !/^\/profile\/.+/.test(router.pathname);

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
      {/* チャットページではグローバルヘッダーを非表示にする */}
      {!router.pathname.startsWith('/chat/') && <Header />}
      {/* チャットページではpadding-topを無効にする */}
      <main className={router.pathname.startsWith('/chat/') ? 'pb-24' : 'pt-20 pb-24'}>
        {loading ? <PageLoader /> : <Component {...pageProps} />}
      </main>
      {/* チャットページとログインページではボトムナビゲーションを非表示にする */}
      {router.pathname.startsWith('/chat/') || router.pathname === '/login' ? null : (
        <BottomNav unreadNotificationCount={unreadNotificationCount} />
      )}
    </div>
  );
};
