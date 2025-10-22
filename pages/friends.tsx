import { GetServerSidePropsContext, NextPage } from 'next';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { serialize, parse } from 'cookie';
import { useState, useRef, MouseEvent as ReactMouseEvent, useEffect, useMemo } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import AvatarIcon from '@/components/AvatarIcon';
import PageLayout from '@/components/PageLayout';

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  last_seen: string | null;
};

type LastMessage = {
  content: string;
  created_at: string;
};

type ChatRoom = {
  id: string;
  other_user: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
  last_message: LastMessage | null;
  unread_count: number;
};

type FriendsPageProps = {
  chatPartners: (Profile & {
    room_id: string;
    last_message: string | null;
    last_message_at: string | null;
    unread_count: number;
  })[];
};

const FriendsPage: NextPage<FriendsPageProps> = ({ chatPartners }) => {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [friendList] = useState(chatPartners);

  // 最終メッセージ時刻でソート
  const sortedFriendList = useMemo(() => {
    return [...friendList].sort((a, b) => {
      return new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime();
    });
  }, [friendList]);

  return (
    <PageLayout maxWidth="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">トーク</h1>

      {friendList.length > 0 ? (
        <div className="space-y-2">
          {sortedFriendList.map((friend) => {
            // ★★★ 修正点: friend.room_id が falsy (undefined, null, '') の場合は
            // 何もレンダリングしないようにするガード句を追加
            if (!friend.room_id) return null;
            return (
              <Link
                key={friend.id}
                href={`/chat/${friend.room_id}`}
                className="flex items-center gap-4 p-3 w-full bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors"
              >
                <div className="relative">
                  <AvatarIcon avatarUrlPath={friend.avatar_url} size={56} />
                  {friend.last_seen &&
                    new Date(new Date().getTime() - new Date(friend.last_seen).getTime()).getMinutes() < 5 && (
                      <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-gray-800" />
                    )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-baseline">
                    <p className={`font-bold truncate ${friend.unread_count > 0 ? 'text-white' : 'text-gray-300'}`}>
                      {friend.username || '未設定'}
                    </p>
                    {friend.last_message_at && (
                      <div className="flex flex-col items-end flex-shrink-0 ml-2">
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(friend.last_message_at), { addSuffix: true, locale: ja })}
                        </p>
                        {friend.unread_count > 0 && (
                          <span className="mt-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-white text-xs font-bold">
                            {friend.unread_count > 99 ? '99+' : friend.unread_count}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-sm truncate ${friend.unread_count > 0 ? 'text-gray-200' : 'text-gray-400'}`}>
                      {friend.last_message || 'まだメッセージはありません'}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">まだトークはありません。</p>
          <p className="text-gray-500 text-sm mt-1">気になる人を見つけてマッチングしましょう！</p>
        </div>
      )}
    </PageLayout>
  );
};

export default FriendsPage;

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

  // タイムラインと同様に、サーバーサイドでPHP APIを叩く
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/get_chat_rooms.php?user_id=${user.id}`);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`APIエラー: ${res.status} ${res.statusText} - ${errorText}`);
    }
    const chatRooms: ChatRoom[] = await res.json();

    if ((chatRooms as any).error) {
      throw new Error((chatRooms as any).error);
    }

    // APIからのレスポンスをFriendsPagePropsの形式に変換
    const chatPartners = chatRooms.map((room) => ({
      id: room.other_user.id,
      username: room.other_user.username,
      avatar_url: room.other_user.avatar_url,
      last_seen: null, // last_seenはPHP APIのレスポンスに含まれていないためnull
      room_id: room.id,
      last_message: room.last_message?.content || null,
      last_message_at: room.last_message?.created_at || null,
      unread_count: room.unread_count,
    }));

    return {
      props: { chatPartners },
    };
  } catch (e: any) {
    return {
      props: { chatPartners: [], error: e.message },
    };
  }
};
