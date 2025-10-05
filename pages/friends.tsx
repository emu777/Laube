import { GetServerSidePropsContext, NextPage } from 'next';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { serialize, parse } from 'cookie';
import { useState, useRef, MouseEvent as ReactMouseEvent, useEffect, useMemo } from 'react';
import { useSupabase } from './_app';
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
          {sortedFriendList.map((friend) => (
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
          ))}
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

  // 1. 自分が参加しているチャットルームを取得
  const { data: chatRooms, error: roomsError } = await supabase
    .from('chat_rooms')
    .select('id, user1_id, user2_id')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

  if (roomsError) {
    console.error('Error fetching chat rooms:', roomsError);
    return { props: { chatPartners: [] } };
  }

  if (!chatRooms || chatRooms.length === 0) {
    return { props: { chatPartners: [] } };
  }

  // 2. チャット相手のIDリストと、ルームIDをキーにしたマップを作成
  const partnerIds = chatRooms.map((room) => (room.user1_id === user.id ? room.user2_id : room.user1_id));
  const roomIdMap = new Map(
    chatRooms.map((room) => [room.user1_id === user.id ? room.user2_id : room.user1_id, room.id])
  );

  // 3. チャット相手のプロフィール情報と、各ルームの最新メッセージ、未読数を取得
  const { data: partnersData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, last_seen')
    .in('id', partnerIds);

  if (profilesError) console.error('Error fetching friend profiles:', profilesError);

  // 各ルームの最新メッセージと未読数を取得するクエリ
  const messageQueries = chatRooms.map((room) =>
    supabase
      .from('messages')
      .select('content, created_at', { count: 'exact' })
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
  );
  const readReceiptsQueries = chatRooms.map((room) =>
    supabase.from('read_receipts').select('last_read_at').eq('room_id', room.id).eq('user_id', user.id).single()
  );

  const messagesResults = await Promise.all(messageQueries);
  const readReceiptsResults = await Promise.all(readReceiptsQueries);

  // 4. 全ての情報を結合
  const chatPartners = (partnersData || []).map((partner) => {
    const roomId = roomIdMap.get(partner.id);
    const roomIndex = chatRooms.findIndex((r) => r.id === roomId);
    const lastMessageData = messagesResults[roomIndex]?.data;
    const lastReadData = readReceiptsResults[roomIndex]?.data;

    // 未読数の計算（本来はDB関数で行うのが望ましい）
    // ここでは簡易的に、最新メッセージが既読時刻より後なら未読とみなす
    const unread_count =
      lastMessageData && (!lastReadData || new Date(lastMessageData.created_at) > new Date(lastReadData.last_read_at))
        ? 1
        : 0;

    return {
      ...partner,
      room_id: roomId || '',
      last_message: lastMessageData?.content || null,
      last_message_at: lastMessageData?.created_at || null,
      unread_count,
    };
  });

  return { props: { chatPartners } };
};
