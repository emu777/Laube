import { GetServerSidePropsContext, NextPage } from 'next';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { serialize, parse } from 'cookie';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { FaRegComment } from 'react-icons/fa';
import AvatarIcon from '@/components/AvatarIcon';
import { useSupabase } from '@/contexts/SupabaseContext';
import type { User } from '@supabase/supabase-js';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import PageLayout from '@/components/PageLayout';

const DynamicPullToRefresh = dynamic(() => import('react-pull-to-refresh'), {
  ssr: false,
});

// ユーザープロフィールの基本的な型を定義
type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  location?: string | null;
  age?: number | null;
  // 必要に応じて他のプロパティも追加
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: Profile | null;
};

type Post = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: Profile | null;
  comments: Comment[];
};

type TimelinePageProps = {
  initialPosts: Post[];
  error?: string;
};

const API_URL = 'https://api.laube777.com/timeline'; // PHP APIのベースURL

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TimelinePage: NextPage<TimelinePageProps> = ({ initialPosts, error: initialError }) => {
  const supabase = useSupabase();
  const router = useRouter();

  const {
    data: posts,
    error,
    mutate,
  } = useSWR<Post[]>(`${API_URL}/get_timeline.php`, fetcher, {
    fallbackData: initialPosts,
  });

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, [supabase]);

  const [user, setUser] = useState<User | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [userToBlock, setUserToBlock] = useState<Profile | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // URLのハッシュをチェックしてコメント欄を開く
  useEffect(() => {
    const hash = router.asPath.split('#')[1];
    if (hash && posts?.some((post) => String(post.id) === hash)) {
      setCommentingPostId(hash);
      // レンダリング後にスクロール
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [router.asPath, posts]);

  // メニューの外側をクリックしたときにメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuPostId(null);
      }
    };

    if (openMenuPostId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuPostId]);

  const handleRefresh = async () => {
    await mutate(); // SWRのデータを再検証
  };

  const handlePost = async () => {
    if (!newPostContent.trim() || !user) return;

    const res = await fetch(`${API_URL}/create_post.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newPostContent, user_id: user.id }),
    });

    if (!res.ok) {
      toast.error('投稿に失敗しました。');
      console.error('Error creating post:', await res.text());
    } else {
      const newPost: Post = await res.json();
      setNewPostContent('');
      setIsFormOpen(false);
      toast.success('投稿しました！');
      // mutate(); // データを再検証してUIを更新
      // ★★★ 修正点: ローカルのキャッシュを即座に更新する ★★★
      mutate((currentPosts = []) => [newPost, ...currentPosts], {
        revalidate: false, // この更新後、再検証は行わない
      });
    }
  };

  const handleComment = async (postId: string) => {
    if (!newCommentContent.trim() || !user) return;

    const res = await fetch(`${API_URL}/create_comment.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newCommentContent, user_id: user.id, post_id: postId }),
    });

    if (!res.ok) {
      toast.error('コメントの投稿に失敗しました。');
      console.error('Error creating comment:', await res.text());
    } else {
      // コメント後の通知ロジックは、Supabaseから移行する際に再設計が必要です。
      // 今回は一旦コメントアウトします。
      // 自分の投稿へのコメントでない場合は通知を送る
      /* const { data: post } = await supabase.from('posts').select('user_id, content').eq('id', postId).single();

      if (post && post.user_id !== user.id) {
        await Promise.all([
          supabase.from('notifications').insert({
            recipient_id: post.user_id,
            sender_id: user.id,
            type: 'comment',
            reference_id: postId, // 投稿ID
            content_preview: post.content.substring(0, 50), // 投稿内容のプレビュー
          }),
          supabase.functions.invoke('send-push-notification', {
            body: {
              recipient_id: post.user_id,
              title: `${user.user_metadata.username || '匿名さん'}さんからコメントが届きました`,
              body: newCommentContent,
              tag: `comment_${postId}`,
              href: `/timeline#${postId}`,
            },
          }),
        ]);
      } */

      setNewCommentContent('');
      setCommentingPostId(null);
      mutate(); // データを再検証してUIを更新
    }
  };

  const handleDelete = async (postId: string) => {
    if (window.confirm('本当にこの投稿を削除しますか？')) {
      const res = await fetch(`${API_URL}/delete_post.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, user_id: user?.id }),
      });

      if (!res.ok) {
        toast.error('投稿の削除に失敗しました。');
        console.error('Error deleting post:', await res.text());
      } else {
        mutate(); // データを再検証してUIを更新
      }
    }
  };

  const handleBlockConfirm = async () => {
    if (!user || !userToBlock) return;

    const { error } = await supabase.rpc('create_mutual_block', {
      p_blocker_id: user.id,
      p_blocked_id: userToBlock.id,
    });

    if (error) {
      console.error('Error blocking user:', error);
      alert('ブロック処理に失敗しました。');
    } else {
      // ブロック後はタイムラインを再取得
      mutate();
      alert(`${userToBlock.username || '匿名さん'}さんをブロックしました。`);
    }
    setUserToBlock(null);
  };

  return (
    <PageLayout>
      <DynamicPullToRefresh onRefresh={handleRefresh}>
        <div className="w-full max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">タイムライン</h1>

          {/* エラー表示 */}
          {(error || initialError) && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg mb-6">
              <p className="font-bold">データ取得エラー</p>
              <p className="text-sm mt-1">{error?.message || initialError}</p>
            </div>
          )}

          {/* 投稿一覧 */}
          <div className="space-y-4">
            {!posts && !error && <div className="text-center py-10">読み込み中...</div>}

            {posts &&
              posts.map((post, index) => (
                <div key={post.id} id={String(post.id)}>
                  <div className="bg-gray-800/50 border border-gray-800 p-4 rounded-xl">
                    <div className="flex items-start space-x-4">
                      {post.user_id && (
                        <Link
                          href={{ pathname: '/profile/[id]', query: { id: post.user_id } }}
                          className="flex-shrink-0 cursor-pointer"
                        >
                          <AvatarIcon avatarUrlPath={post.profiles?.avatar_url} size={40} priority={index < 3} />
                        </Link>
                      )}
                      <div className="flex-1 flex flex-col">
                        <div className="flex-1">
                          <div className="flex justify-between items-baseline">
                            <div>
                              <p className="font-bold text-sm">{post.profiles?.username || '匿名さん'}</p>
                              <p className="text-xs text-gray-400 mt-0.5 mb-[15px]">
                                {post.profiles?.location || '未設定'} | {post.profiles?.age || '??'}歳
                              </p>
                            </div>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ja })}
                            </p>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap break-words">{post.content}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          {/* コメントアイコン */}
                          <button
                            onClick={() =>
                              setCommentingPostId(commentingPostId === String(post.id) ? null : String(post.id))
                            }
                            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
                          >
                            <FaRegComment />
                            <span className="text-xs">{post.comments.length}</span>
                          </button>

                          {/* メニューボタン */}
                          <div className="relative" ref={openMenuPostId === String(post.id) ? menuRef : null}>
                            <button
                              onClick={() =>
                                setOpenMenuPostId(openMenuPostId === String(post.id) ? null : String(post.id))
                              }
                              className="text-gray-400 hover:text-white transition-colors p-1 rounded-full"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            {/* ドロップダウンメニュー */}
                            {openMenuPostId === String(post.id) && (
                              <div className="absolute right-0 mt-2 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-10">
                                {user && user.id === post.user_id && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuPostId(null);
                                      handleDelete(String(post.id));
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                                  >
                                    削除
                                  </button>
                                )}
                                {user && user.id !== post.user_id && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuPostId(null);
                                      setUserToBlock(post.profiles);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                                  >
                                    ブロック
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    toast.error('この機能は現在準備中です。');
                                    setOpenMenuPostId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                >
                                  通報
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {commentingPostId === String(post.id) && (
                    <div className="pl-10 pr-4 -mt-2 mb-2">
                      {/* コメント一覧 */}
                      <div className="space-y-3 mt-4 border-t border-gray-700 pt-4">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex items-start space-x-3 pl-2">
                            {comment.user_id && (
                              <Link
                                href={{ pathname: '/profile/[id]', query: { id: comment.user_id } }}
                                className="flex-shrink-0"
                              >
                                <AvatarIcon avatarUrlPath={comment.profiles?.avatar_url} size={32} />
                              </Link>
                            )}
                            <div className="flex-1 bg-gray-700/50 rounded-lg px-3 py-2">
                              <p className="text-sm font-bold">{comment.profiles?.username || '匿名さん'}</p>
                              <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap break-words">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* コメント投稿フォーム */}
                      <div className="mt-4 flex items-center gap-2">
                        <input
                          type="text"
                          className="w-full bg-gray-700/50 p-2 rounded-full border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder-gray-500 text-base px-4"
                          placeholder="コメントを追加..."
                          value={newCommentContent}
                          onChange={(e) => setNewCommentContent(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleComment(String(post.id))}
                        />
                        <button
                          onClick={() => handleComment(String(post.id))}
                          className="text-pink-500 hover:text-pink-400 disabled:opacity-50"
                          disabled={!newCommentContent.trim()}
                        >
                          送信
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </DynamicPullToRefresh>

      {/* 投稿フォームモーダル */}
      {isFormOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setIsFormOpen(false)}
        >
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
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
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
      <button
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-24 right-4 sm:right-6 bg-pink-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40 hover:bg-pink-700 transition-transform hover:scale-110 active:scale-100"
        aria-label="新しい投稿"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </PageLayout>
  );
};

export default TimelinePage;

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

  // Xserver上のPHP APIからタイムラインデータを取得
  try {
    const response = await fetch('https://api.laube777.com/timeline/get_timeline.php');
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch timeline data: ${errorText}`);
    }
    const initialPosts = await response.json();
    return { props: { initialPosts } };
  } catch (error: any) {
    console.error('Error fetching timeline from Xserver:', error);
    return { props: { initialPosts: [], error: error.message } };
  }

  return {
    props: {
      initialPosts: [],
    },
  };
};
