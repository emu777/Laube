import { GetServerSidePropsContext, NextPage } from 'next';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useSupabase } from '@/contexts/SupabaseContext';
import type { User } from '@supabase/supabase-js';
import AvatarIcon from '@/components/AvatarIcon';
import { IoSend, IoChevronBack } from 'react-icons/io5';
import Link from 'next/link';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { serialize, parse } from 'cookie';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const API_URL = 'https://api.laube777.com/api/chat';

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type LastMessage = {
  content: string;
  created_at: string;
};

type ChatRoom = {
  id: string;
  other_user: Profile;
  last_message: LastMessage | null;
  unread_count: number;
};

type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender: Profile | null;
};

type ChatRoomPageProps = {
  room: ChatRoom;
  initialMessages: ChatMessage[];
  error?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ChatRoomPage: NextPage<ChatRoomPageProps> = ({ room, initialMessages, error: serverError }) => {
  const router = useRouter();
  const { id: roomId } = router.query;
  const supabase = useSupabase();
  const { mutate } = useSWRConfig();

  const [user, setUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: messages,
    error,
    isLoading,
  } = useSWR<ChatMessage[]>(roomId ? `${API_URL}/get_chat_messages.php?room_id=${roomId}` : null, fetcher, {
    fallbackData: initialMessages,
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    fetchUser();
  }, [supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !roomId) return;

    // 送信するメッセージをローカル変数に保持
    const messageToSend = newMessage;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      room_id: String(roomId),
      sender_id: user.id,
      content: newMessage,
      created_at: new Date().toISOString(),
      is_read: false,
      sender: {
        id: user.id,
        username: user.user_metadata.username,
        avatar_url: user.user_metadata.avatar_url,
      },
    };

    // 楽観的更新
    mutate(
      `${API_URL}/get_chat_messages.php?room_id=${roomId}`,
      (currentMessages: ChatMessage[] | undefined = []) => [...currentMessages, optimisticMessage],
      false
    );

    // UIを即座に更新
    setNewMessage('');

    const res = await fetch(`${API_URL}/create_chat_message.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        sender_id: user.id,
        content: messageToSend, // ローカル変数を使用
      }),
    });

    if (!res.ok) {
      console.error('Failed to send message');
      mutate(`${API_URL}/get_chat_messages.php?room_id=${roomId}`);
    } else {
      const savedMessage = await res.json();
      mutate(
        `${API_URL}/get_chat_messages.php?room_id=${roomId}`,
        (currentMessages: ChatMessage[] | undefined = []) => {
          const newMessages = currentMessages.filter((msg) => msg.id !== tempId);
          return [...newMessages, savedMessage];
        },
        false
      );
    }
  };

  const otherUser = room?.other_user;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="bg-gray-800/80 backdrop-blur-sm p-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/chat" className="p-2 -ml-2">
          <IoChevronBack size={24} />
        </Link>
        {otherUser && <AvatarIcon avatarUrlPath={otherUser?.avatar_url} size={40} />}
        <h1 className="text-lg font-bold truncate">{otherUser?.username || 'チャット'}</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && !initialMessages && <p className="text-center">メッセージを読み込み中...</p>}
        {(error || serverError) && (
          <p className="text-center text-red-400">エラーが発生しました: {serverError || error.message}</p>
        )}
        {messages?.map((message) => (
          <div
            key={message.id}
            className={`flex items-end gap-3 ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            {message.sender_id !== user?.id && <AvatarIcon avatarUrlPath={message.sender?.avatar_url} size={32} />}
            <div
              className={`max-w-xs md:max-w-md p-3 rounded-2xl ${
                message.sender_id === user?.id ? 'bg-pink-600 rounded-br-lg' : 'bg-gray-700 rounded-bl-lg'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className="bg-gray-800 p-4 sticky bottom-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="メッセージを入力"
            className="flex-1 bg-gray-700 p-3 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-white px-4"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-pink-600 text-white rounded-full p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-pink-700"
          >
            <IoSend size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatRoomPage;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { id: roomId } = ctx.params || {};
  if (!roomId || typeof roomId !== 'string') {
    return { notFound: true };
  }

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

  try {
    // タイムラインと同様に、サーバーサイドでPHP APIを並行して叩く
    const [roomRes, messagesRes] = await Promise.all([
      fetch(`https://api.laube777.com/api/chat/get_chat_rooms.php?user_id=${user.id}`),
      fetch(`https://api.laube777.com/api/chat/get_chat_messages.php?room_id=${roomId}`),
    ]);

    if (!roomRes.ok || !messagesRes.ok) {
      throw new Error('APIからのデータ取得に失敗しました。');
    }

    const allRooms: ChatRoom[] = await roomRes.json();
    const initialMessages: ChatMessage[] = await messagesRes.json();

    const room = allRooms.find((r) => r.id === roomId);

    if (!room) {
      return { notFound: true };
    }

    return { props: { room, initialMessages } };
  } catch (e: any) {
    return { props: { room: null, initialMessages: [], error: e.message } };
  }
};
