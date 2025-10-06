import { GetServerSidePropsContext, NextPage } from 'next';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { serialize, parse } from 'cookie';
import { useRouter } from 'next/router';
import AvatarIcon from '@/components/AvatarIcon';
import { useSupabase } from '@/contexts/SupabaseContext';
import useSWR, { useSWRConfig } from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { FaHeart, FaComment, FaEnvelope } from 'react-icons/fa';

type Notification = {
  id: string;
  created_at: string;
  type: 'like' | 'comment' | 'message';
  reference_id: string;
  content_preview: string | null;
  is_read: boolean;
  sender: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type GroupedNotification = Notification & {
  is_grouped: true;
  count: number;
  senders: (Notification['sender'] & { is_read: boolean })[];
};

type DisplayNotification = Notification | GroupedNotification;

type NotificationsPageProps = {
  notifications: DisplayNotification[];
  unreadNotificationCount: number;
};

// 型ガード関数
const isGroupedNotification = (notification: DisplayNotification): notification is GroupedNotification => {
  return 'is_grouped' in notification && notification.is_grouped === true;
};

const getNotificationInfo = (notification: Notification) => {
  const senderName = notification.sender?.username || '匿名さん';
  switch (notification.type) {
    case 'like':
      return {
        icon: <FaHeart className="text-pink-500" />,
        message: `${senderName}さんがあなたに興味を持っています`,
        href: {
          pathname: '/profile/[id]',
          query: { id: notification.sender?.id },
        },
      };
    case 'comment':
      return {
        icon: <FaComment className="text-blue-400" />,
        message: `${senderName}さんからコメントが届いています`,
        href: `/timeline#${notification.reference_id}`, // アンカーリンクで投稿に飛ぶ
      };
    case 'message':
      return {
        icon: <FaEnvelope className="text-green-400" />,
        message: `${senderName}さんからトークが届いています`,
        href: `/chat/${notification.reference_id}`,
      };
    default:
      return {
        icon: null,
        message: '新しい通知があります',
        href: '/',
      };
  }
};

const NotificationsPage: NextPage<NotificationsPageProps> = ({ notifications: serverNotifications }) => {
  const supabase = useSupabase();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: notifications } = useSWR('notifications', () => serverNotifications, {
    fallbackData: serverNotifications,
  });

  const handleNotificationClick = (
    notification: DisplayNotification & {
      href: string | { pathname: string; query: { id: string | undefined } };
    }
  ) => {
    // --- 楽観的UI更新 ---
    // グループ化された「いいね」通知の場合
    if (isGroupedNotification(notification) && notification.type === 'like') {
      // UIから「いいね」のグループ通知を削除
      mutate((currentNotifications: DisplayNotification[] | undefined) => {
        const notificationsArray = Array.isArray(currentNotifications) ? currentNotifications : [];
        return notificationsArray.filter((n) => {
          if (isGroupedNotification(n)) {
            return n.type !== 'like';
          }
          return true;
        });
      }, false);

      // サーバー側で関連する未読通知をすべて既読に更新
      (async () => {
        const unreadSenderIds = notification.senders.filter((s) => !s.is_read).map((s) => s?.id);
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('type', 'like')
          .in('sender_id', unreadSenderIds);
        if (updateError) {
          console.error('Error updating like notifications:', updateError);
          mutate('notifications'); // エラー時はSWRキャッシュを再検証してUIを元に戻す
        }
      })();
    } else {
      // 個別の通知の場合
      // UIからクリックされた通知を削除
      mutate((currentNotifications: DisplayNotification[] | undefined) => {
        const notificationsArray = Array.isArray(currentNotifications) ? currentNotifications : [];
        return notificationsArray.filter((n) => n.id !== notification.id);
      }, false);

      // まだ読んでいない通知の場合のみ、サーバーに既読更新をリクエスト
      if (!notification.is_read) {
        (async () => {
          const { error: updateError } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notification.id);
          if (updateError) {
            console.error('Error updating notification:', updateError);
            mutate('notifications'); // エラー時はUIを元に戻す
          }
        })();
      }
    }

    router.push(notification.href);
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
      <main className="p-4">
        <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">通知</h1>

          {notifications && notifications.length > 0 ? (
            <div className="space-y-2">
              {notifications.map((notification) => {
                if (isGroupedNotification(notification)) {
                  const { icon, href } = getNotificationInfo(notification);
                  const latestSender = notification.sender;
                  const otherSendersCount = notification.count > 1 ? notification.count - 1 : 0; // 1件の場合は「他0人」と表示しない
                  let message = '';
                  if (notification.type === 'like') {
                    message = `${latestSender?.username || '匿名さん'}さん${otherSendersCount > 0 ? ` 他${otherSendersCount}人` : ''}があなたに興味を持っています`;
                  } else if (notification.type === 'comment') {
                    message = `${latestSender?.username || '匿名さん'}さん${otherSendersCount > 0 ? ` 他${otherSendersCount}人` : ''}からコメントが届いています`;
                  }

                  const isUnread = notification.senders.some((s) => !s.is_read);

                  return (
                    <div
                      key={notification.type + (notification.type === 'comment' ? notification.reference_id : '')}
                      onClick={() => handleNotificationClick({ ...notification, href })}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-colors cursor-pointer ${
                        isUnread ? 'bg-pink-900/20 border border-pink-800/50' : 'bg-gray-800/50'
                      } hover:bg-gray-700/60`}
                    >
                      <div className="relative flex -space-x-4">
                        {notification.senders.slice(0, 3).map((sender, index) => (
                          <AvatarIcon key={sender?.id || index} avatarUrlPath={sender?.avatar_url} size={40} />
                        ))}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {isUnread && (
                          <span className="text-xs font-bold text-pink-400 bg-pink-900/40 px-2 py-0.5 rounded-full mb-1 inline-block">
                            New
                          </span>
                        )}
                        <p className="text-sm text-gray-300">{message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ja })}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700">
                        {icon}
                      </div>
                    </div>
                  );
                }

                // 通常の通知
                const { icon, message, href } = getNotificationInfo(notification as Notification);
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick({ ...notification, href })}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-colors cursor-pointer ${
                      notification.is_read ? 'bg-gray-800/50' : 'bg-pink-900/20 border border-pink-800/50'
                    } hover:bg-gray-700/60`}
                  >
                    <AvatarIcon avatarUrlPath={notification.sender?.avatar_url} size={40} />
                    <div className="flex-1 overflow-hidden">
                      {!notification.is_read && (
                        <span className="text-xs font-bold text-pink-400 bg-pink-900/40 px-2 py-0.5 rounded-full mb-1 inline-block">
                          New
                        </span>
                      )}
                      <p className="text-sm text-gray-300">{message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ja })}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700">
                      {icon}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">まだ通知はありません。</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;

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

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*, sender:sender_id(id, username, avatar_url)')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false });

  if (error) console.error('Error fetching notifications:', error);

  const groupedNotifications: DisplayNotification[] = [];
  const likeGroup: Notification[] = [];
  const messageGroups: { [key: string]: Notification[] } = {};
  const commentGroups: { [key: string]: Notification[] } = {};

  // 通知を種類ごとに分類
  (notifications || []).forEach((n) => {
    if (n.type === 'like') {
      likeGroup.push(n);
    } else if (n.type === 'message') {
      if (!messageGroups[n.sender?.id || '']) messageGroups[n.sender?.id || ''] = [];
      messageGroups[n.sender?.id || ''].push(n);
    } else if (n.type === 'comment') {
      if (!commentGroups[n.reference_id]) commentGroups[n.reference_id] = [];
      commentGroups[n.reference_id].push(n);
    } else {
      groupedNotifications.push(n);
    }
  });

  // いいねをグループ化
  if (likeGroup.length > 0) {
    const latest = likeGroup[0];
    groupedNotifications.push({
      ...latest,
      is_grouped: true,
      count: likeGroup.length,
      senders: likeGroup
        .map((n) => (n.sender ? { ...n.sender, is_read: n.is_read } : null))
        .filter(Boolean) as GroupedNotification['senders'],
    });
  }

  // コメントを投稿ごとにグループ化
  Object.values(commentGroups).forEach((group) => {
    if (group.length > 1) {
      const latest = group[0];
      groupedNotifications.push({
        ...latest,
        is_grouped: true,
        count: group.length,
        senders: group
          .map((n) => (n.sender ? { ...n.sender, is_read: n.is_read } : null))
          .filter(Boolean) as GroupedNotification['senders'],
      });
    } else {
      groupedNotifications.push(group[0]);
    }
  });

  // トークは送信者ごとに最新の1件のみ表示
  Object.values(messageGroups).forEach((group) => groupedNotifications.push(group[0]));

  // 最新順にソート
  groupedNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { props: { notifications: groupedNotifications } };
};
