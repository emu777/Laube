import { GetServerSidePropsContext, NextPage } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import AvatarIcon from '@/components/AvatarIcon';

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type Message = {
  id: number;
  created_at: string;
  room_id: string;
  sender_id: string;
  content: string;
  sender: Profile;
};

type ChatRoomPageProps = {
  initialMessages: Message[];
  otherUser: Profile | null;
  roomId: string;
};

const ChatRoomPage: NextPage<ChatRoomPageProps> = ({ initialMessages, otherUser, roomId }) => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // このルームに入室したときに、既読情報を更新する
  useEffect(() => {
    if (user && roomId) {
      const markAsRead = async () => {
        await supabase.from('read_receipts').upsert({
          room_id: roomId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        });
      };
      markAsRead();
    }
  }, [user, roomId, supabase]);

  useEffect(() => {
    const channel = supabase
      // このルーム専用の一意で固定のチャンネル名を指定
      .channel(`chat-room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as Omit<Message, 'sender'>;
          const senderProfile =
            newMessage.sender_id === user?.id
              ? { id: user.id, username: user.user_metadata.username, avatar_url: user.user_metadata.avatar_url }
              : otherUser;

          if (senderProfile) {
            setMessages((currentMessages) => [...currentMessages, { ...newMessage, sender: senderProfile as Profile }]);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime channel error:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, roomId, user, otherUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !otherUser) return;

    const { error } = await supabase
      .from('messages')
      .insert({ content: newMessage, room_id: roomId, sender_id: user.id });

    if (error) {
      console.error('Error sending message:', error);
      alert('メッセージの送信に失敗しました。');
    } else {
      setNewMessage('');
    }

    // 相手に通知を送信
    await Promise.all([
      supabase.from('notifications').insert({
        recipient_id: otherUser.id,
        sender_id: user.id,
        type: 'message',
        reference_id: roomId,
        content_preview: newMessage.substring(0, 50),
      }),
      supabase.functions.invoke('send-push-notification', {
        body: {
          recipient_id: otherUser.id,
          title: `${user.user_metadata.username || '匿名さん'}さんから新着メッセージ`,
          body: newMessage.substring(0, 50),
          tag: `chat-${roomId}`,
          href: `/chat/${roomId}`,
        },
      }),
    ]);
  };

  if (!otherUser) {
    return <div>ユーザーが見つかりません。</div>;
  }

  return (
    <div className="bg-gray-900 flex flex-col h-screen text-white">
      <header className="fixed top-0 left-0 right-0 p-4 flex items-center gap-4 bg-gray-900/80 backdrop-blur-sm z-40 border-b border-gray-700">
        <button onClick={() => router.back()} className="text-white" aria-label="戻る">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <AvatarIcon avatarUrlPath={otherUser.avatar_url} size={40} />
        <h1 className="text-lg font-bold truncate">{otherUser.username || '未設定'}</h1>
      </header>

      <main className="flex-1 overflow-y-auto pt-20 pb-24 px-4 space-y-4">
        {messages.map((message) => {
          const isMe = message.sender_id === user?.id;
          return (
            <div key={message.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && <AvatarIcon avatarUrlPath={message.sender?.avatar_url} size={32} />}
              <div
                className={`max-w-xs md:max-w-md p-3 rounded-2xl ${isMe ? 'bg-pink-600 rounded-br-md' : 'bg-gray-700 rounded-bl-md'}`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm z-30 p-2 border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-full focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-colors text-base px-4"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-3 rounded-full bg-pink-600 text-white disabled:opacity-50 hover:bg-pink-700 transition-colors"
            aria-label="送信"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </footer>
    </div>
  );
};

export default ChatRoomPage;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const { id: roomId } = ctx.params as { id: string };

  // チャットルームの存在と参加者を確認
  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .select('*, user1:profiles!user1_id(*), user2:profiles!user2_id(*)')
    .eq('id', roomId)
    .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
    .single();

  if (roomError || !room) {
    return { notFound: true };
  }

  // メッセージを取得
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*, sender:sender_id(id, username, avatar_url)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Error fetching messages:', messagesError);
    return { notFound: true };
  }

  const otherUser = room.user1.id === session.user.id ? room.user2 : room.user1;

  return {
    props: {
      initialMessages: messages || [],
      otherUser: otherUser || null,
      roomId,
    },
  };
};
