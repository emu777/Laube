import { useState, useEffect } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { GetServerSidePropsContext } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import PageLayout from '@/components/PageLayout';

const SettingsPage = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(window.Notification.permission);
    }
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
        await supabase.from('push_subscriptions').delete().match({ subscription: currentSubscription });
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
                  ? '新しい「いいね」やメッセージを即時にお知らせします。'
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
      </div>
    </PageLayout>
  );
};

export default SettingsPage;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  return { props: {} };
};
