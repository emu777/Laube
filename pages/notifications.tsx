import { GetServerSidePropsContext, NextPage } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import AvatarIcon from '@/components/AvatarIcon';
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

type NotificationsPageProps = {
  notifications: Notification[];
  unreadNotificationCount: number;
};

const getNotificationInfo = (notification: Notification) => {
  const senderName = notification.sender?.username || '匿名さん';
  switch (notification.type) {
    case 'like':
      return {
        icon: <FaHeart className="text-pink-500" />,
        message: `${senderName}さんがあなたに興味を持っています`,
        href: `/profile/${notification.sender?.id}`,
      };
    case 'comment':
      return {
        icon: <FaComment className="text-blue-400" />,
        message: `「${notification.content_preview?.substring(0, 20)}...」に${senderName}さんからコメントが届きました`,
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

const NotificationsPage: NextPage<NotificationsPageProps> = ({ notifications, unreadNotificationCount }) => {
  const supabase = useSupabaseClient();
  const router = useRouter();

  const handleNotificationClick = async (notification: Notification & { href: string }) => {
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
    }
    // 通知を削除
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notification.id);
    if (deleteError) console.error('Error deleting notification:', deleteError);

    router.push(notification.href);
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Header />
      <main className="p-4 pt-24 pb-24">
        <div className="w-full max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">通知</h1>

          {notifications.length > 0 ? (
            <div className="space-y-2">
              {notifications.map((notification) => {
                const { icon, message, href } = getNotificationInfo(notification);
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick({ ...notification, href })}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-colors cursor-pointer ${
                      notification.is_read ? 'bg-gray-800/50' : 'bg-pink-900/20 border border-pink-800/50'
                    } hover:bg-gray-700/60`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700">{icon}</div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm text-gray-300">{message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ja })}
                      </p>
                    </div>
                    <AvatarIcon avatarUrlPath={notification.sender?.avatar_url} size={40} />
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
      <BottomNav />
    </div>
  );
};

export default NotificationsPage;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*, sender:sender_id(id, username, avatar_url)')
    .eq('recipient_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) console.error('Error fetching notifications:', error);

  return { props: { notifications: notifications || [] } };
};