import { GetServerSidePropsContext, NextPage } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'

type Post = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type TimelinePageProps = {
  initialPosts: Post[];
};

const TimelinePage: NextPage<TimelinePageProps> = ({ initialPosts }) => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [posts, setPosts] = useState(initialPosts);
  const [newPostContent, setNewPostContent] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const fetchAvatars = async () => {
      const urls: Record<string, string | null> = {};
      for (const post of posts) {
        if (post.profiles?.avatar_url && !urls[post.profiles.avatar_url]) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(post.profiles.avatar_url);
          urls[post.profiles.avatar_url] = data.publicUrl;
        }
      }
      setAvatarUrls(urls);
    };
    fetchAvatars();
  }, [posts, supabase]);

  // リアルタイムで新しい投稿を購読する
  useEffect(() => {
    const channel = supabase
      .channel('realtime posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          // 新しい投稿データを取得
          const newPost = payload.new as Post;

          // 投稿者のプロフィール情報を取得
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', newPost.user_id)
            .single();

          // 新しい投稿オブジェクトを作成し、投稿一覧の先頭に追加
          setPosts((currentPosts) => [{ ...newPost, profiles: profile }, ...currentPosts]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((currentPosts) => currentPosts.filter(post => post.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, setPosts]);

  const handlePost = async () => {
    if (!newPostContent.trim() || !user) return;

    const { error } = await supabase
      .from('posts')
      .insert({ content: newPostContent, user_id: user.id });

    if (error) {
      console.error('Error creating post:', error);
    } else {
      setNewPostContent('');
      setIsFormOpen(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (window.confirm('本当にこの投稿を削除しますか？')) {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        alert('投稿の削除に失敗しました。');
      }
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
      <Header />
      <main className="p-4 pt-24 pb-24">
        <div className="w-full max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">タイムライン</h1>

          {/* 投稿一覧 */}
          <div className="space-y-4">
            {posts.map((post) => (              <div key={post.id} className="bg-gray-800/50 border border-gray-800 p-4 rounded-xl flex space-x-4 shadow-md relative">
                <Link href={`/profile/${post.user_id}`} className="flex-shrink-0 cursor-pointer">
                  <div className="relative w-[30px] h-[30px] rounded-full bg-gray-700 overflow-hidden">
                    {post.profiles?.avatar_url && avatarUrls[post.profiles.avatar_url] && (
                      <Image
                        src={avatarUrls[post.profiles.avatar_url]!}
                        alt="avatar"
                        className="object-cover"
                        fill
                      />
                    )}
                  </div>
                </Link>
                <div className="flex-1 flex flex-col">
                  <div className="flex-1">
                    <div className="flex items-baseline space-x-2">
                      <p className="font-bold">{post.profiles?.username || '匿名さん'}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(post.created_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{post.content}</p>
                  </div>
                  {user && user.id === post.user_id && (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="delete-button"
                        aria-label="投稿を削除"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>削除</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 投稿フォームモーダル */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setIsFormOpen(false)}>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">いま、何してる？</h2>
              <textarea
                className="w-full bg-gray-700/50 p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder-gray-400 text-white"
                rows={4}
                placeholder="自由につぶやいてみよう"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-4 pt-2">
                <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  キャンセル
                </button>
                <button
                  onClick={handlePost}
                  className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  disabled={!newPostContent.trim()}
                >
                  投稿
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 投稿ボタン */}
      <button onClick={() => setIsFormOpen(true)} className="fixed bottom-24 right-4 sm:right-6 bg-pink-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40 hover:bg-pink-700 transition-transform hover:scale-110 active:scale-100" aria-label="新しい投稿">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
      </button>

      <BottomNav />
    </div>
  );
};

export default TimelinePage

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, user_id, profiles(username, avatar_url)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
  }

  return {
    props: {
      initialPosts: posts || [],
    },
  };
};