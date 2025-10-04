import { useState, useEffect } from 'react';
import { GetServerSidePropsContext } from 'next';
import { serialize, parse } from 'cookie';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { useSupabase } from './_app';
import type { User } from '@supabase/supabase-js';
import PageLayout from '@/components/PageLayout';
import Link from 'next/link';

const SettingsPage = () => {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);

  // getServerSideProps と _app.tsx で認証状態は管理されているため、
  // この onAuthStateChange は不要です。
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, [supabase]);

  useEffect(() => {
    // 購読状態を正しく判定するために、Service Workerの準備を待ってからチェックする
    const checkSubscriptionStatus = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription && window.Notification.permission === 'granted') {
          setNotificationPermission('granted');
        } else if (window.Notification.permission === 'denied') {
          setNotificationPermission('denied');
        } else {
          // 購読がない場合は、許可状態が 'granted' でも 'default' として扱う
          setNotificationPermission('default');
        }
      }
    };
    checkSubscriptionStatus();
  }, []);

  const handleNotificationToggle = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !user) {
      alert('お使いのブラウザはプッシュ通知に対応していません。');
      return;
    }

    setIsSubscribing(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const currentSubscription = await registration.pushManager.getSubscription();

      if (currentSubscription) {
        // --- 購読解除処理 ---
        await currentSubscription.unsubscribe();
        // PushSubscriptionオブジェクト全体ではなく、endpointを元に削除する
        await supabase.from('push_subscriptions').delete().eq('subscription->>endpoint', currentSubscription.endpoint);
        setNotificationPermission('default');
        alert('通知をオフにしました。');
      } else {
        // --- 購読処理 (Promiseを返さない古いブラウザにも対応) ---
        const permissionResult = await new Promise<NotificationPermission>((resolve) => {
          const promise = window.Notification.requestPermission(resolve);
          if (promise) {
            promise.then(resolve);
          }
        });

        if (permissionResult === 'granted') {
          const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          });
          setNotificationPermission('granted');
          await supabase
            .from('push_subscriptions')
            .upsert({ user_id: user.id, subscription: newSubscription }, { onConflict: 'user_id,subscription' });
          alert('通知をオンにしました！');
        } else if (permissionResult === 'denied') {
          setNotificationPermission('denied');
          alert(
            '通知がブロックされています。ブラウザの設定からこのサイトの通知を許可してください。\n\n【設定変更の方法】\nアドレスバーの左側にある鍵マーク(🔒)をクリックし、通知を「許可」に変更してください。'
          );
        } else {
          setNotificationPermission('default');
          alert('通知の許可が保留されました。');
        }
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      alert('通知設定の変更中にエラーが発生しました。');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <PageLayout maxWidth="max-w-2xl">
      <div className="space-y-8 pb-10">
        <h1 className="text-center w-full text-2xl font-bold">設定</h1>
        <div className="bg-gray-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b border-gray-700 pb-3">通知設定</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">プッシュ通知</p>
              <p className="text-sm text-gray-400">
                {notificationPermission === 'granted'
                  ? 'アプリを閉じていても通知が届くようになります。'
                  : notificationPermission === 'denied'
                    ? '通知はブロックされています。'
                    : '通知はオフになっています。'}
              </p>
            </div>
            <button
              onClick={handleNotificationToggle}
              disabled={isSubscribing || notificationPermission === 'denied'}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                notificationPermission === 'granted'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-pink-600 hover:bg-pink-700 text-white'
              }`}
            >
              {isSubscribing ? '処理中...' : notificationPermission === 'granted' ? 'オフにする' : 'オンにする'}
            </button>
          </div>
          {notificationPermission === 'denied' && (
            <p className="text-xs text-yellow-400">
              ブラウザの設定で通知がブロックされています。アドレスバーの鍵マーク(🔒)から設定を変更してください。
            </p>
          )}
        </div>
        {/* ここからログアウトのセクションを追加 */}
        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <Link href="/logout" className="inline-block text-red-500 hover:text-red-400 transition-colors duration-200">
            ログアウト
          </Link>
        </div>
        {/* ここまで */}
      </div>
    </PageLayout>
  );
};

export default SettingsPage;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const cookies = {
    getAll: () => {
      const parsedCookies = parse(ctx.req.headers.cookie || '');
      return Object.entries(parsedCookies).map(([name, value]) => ({ name, value }));
    },
    setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
      ctx.res.setHeader(
        'Set-Cookie',
        cookiesToSet.map(({ name, value, options }) => serialize(name, value, options))
      );
    },
  };
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  return { props: {} };
};
