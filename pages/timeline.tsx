import { GetServerSidePropsContext, NextPage } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '@/components/Header'
import useSWR from 'swr';
import { FaRegComment } from 'react-icons/fa';
import BottomNav from '@/components/BottomNav'
import AvatarIcon from '@/components/AvatarIcon';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  parent_post?: {
    user_id: string;
    profiles: { username: string | null; avatar_url: string | null; }[] | null;
  } | null;
};

type Post = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
    location: string | null;
    age: number | null;
  } | null;
  comments: Comment[];
};

type TimelineItem = (Post & { item_type: 'post' }) | (Comment & { item_type: 'comment' });

type TimelinePageProps = {
  initialItems: TimelineItem[];
};

const TimelinePage: NextPage = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const [newPostContent, setNewPostContent] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetcher = useCallback(async (key: string) => {
    if (!user) return [];

    // 1. ブロック関係にあるユーザーIDのリストを取得
    const { data: blocksData } = await supabase
      .from('blocks')
      .select('blocker_id,blocked_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
    const blockedUserIds = new Set<string>();
    if (blocksData) {
      for (const block of blocksData) {
        if (block.blocker_id === user.id) blockedUserIds.add(block.blocked_id);
        if (block.blocked_id === user.id) blockedUserIds.add(block.blocker_id);
      }
    }
    const blockedUserIdsArray = Array.from(blockedUserIds);

    // 2. 投稿とコメントを取得 (ブロックしたユーザーは除外)
    let postsQuery = supabase
      .from('posts')
      .select('*, profiles(username, avatar_url, location, age), comments(*, profiles(username, avatar_url))')
      .order('created_at', { ascending: false });

    if (blockedUserIdsArray.length > 0) {
      postsQuery = postsQuery.not('user_id', 'in', `(${blockedUserIdsArray.join(',')})`);
      postsQuery = postsQuery.filter('comments.user_id', 'not.in', `(${blockedUserIdsArray.join(',')})`);
    }

    const { data: postsData, error: postsError } = await postsQuery;
    if (postsError) throw postsError;

    return (postsData || []).map((p: Post) => ({ ...p, item_type: 'post' })) as TimelineItem[];
  }, [supabase, user]);

  const { data: items, error, isLoading, mutate } = useSWR<TimelineItem[]>('timeline_items', fetcher, {});

  // URLのハッシュをチェックしてコメント欄を開く
  useEffect(() => {
    const hash = router.asPath.split('#')[1];
    if (hash) {
      const postExists = items?.some(item => item.item_type === 'post' && item.id === hash);
      if (postExists) {
        setCommentingPostId(hash);
        // レンダリング後にスクロール
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [router.asPath, items]);

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

  // リアルタイムで新しい投稿を購読する
  useEffect(() => {
    const channel = supabase
      .channel('realtime posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const newPost = payload.new as Post;
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url, location, age')
            .eq('id', newPost.user_id)
            .single();
          mutate(currentItems => [{ ...newPost, profiles: profile, comments: [], item_type: 'post' }, ...(currentItems || [])], false);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          mutate(currentItems => (currentItems || []).filter(item => item.id !== payload.old.id), false);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        async (payload) => {
          const newComment = payload.new as Comment;
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url, location, age')
            .eq('id', newComment.user_id)
            .single();

          const { data: parentPostProfile } = await supabase
            .from('posts')
            .select('user_id, profiles(username, avatar_url)')
            .eq('id', newComment.post_id)
            .single();

          mutate(currentItems => {
            // 元の投稿をタイムラインから探す
            const parentPostIndex = (currentItems || []).findIndex(item => item.item_type === 'post' && item.id === newComment.post_id);
            if (parentPostIndex === -1) return currentItems; // 元の投稿が見つからない場合は何もしない

            // 元の投稿の情報をコピーし、新しいコメント情報を追加する
            const parentPost = { ...(currentItems || [])[parentPostIndex] } as Post & { item_type: 'post' };
            const newCommentForPost: Comment = { ...newComment, profiles: profile, parent_post: parentPostProfile };
            parentPost.comments = [newCommentForPost, ...parentPost.comments];

            // 新しいコメントアイテムを作成
            const newCommentItem: TimelineItem = {
              ...newComment,
              profiles: profile,
              parent_post: parentPostProfile,
              item_type: 'comment'
            };
            
            // タイムラインから元の投稿を一旦削除し、コメントと元の投稿を先頭に追加する
            const filteredItems = (currentItems || []).filter((_, index) => index !== parentPostIndex);
            return [parentPost, newCommentItem, ...filteredItems];
          }, false);
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, mutate]);

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

  const handleComment = async (postId: string) => {
    if (!newCommentContent.trim() || !user) return;

    const { error } = await supabase
      .from('comments')
      .insert({ content: newCommentContent, user_id: user.id, post_id: postId });

    if (error) {
      console.error('Error creating comment:', error);
      alert('コメントの投稿に失敗しました。');
    } else {
      // 自分の投稿へのコメントでない場合は通知を送る
      const { data: post } = await supabase
        .from('posts')
        .select('user_id, content')
        .eq('id', postId)
        .single();

      if (post && post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          recipient_id: post.user_id,
          sender_id: user.id,
          type: 'comment',
          reference_id: postId, // 投稿ID
          content_preview: post.content.substring(0, 50), // 投稿内容のプレビュー
        });
      }

      setNewCommentContent('');
      setCommentingPostId(null);
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
            {isLoading && (
              <div className="text-center py-10">
                <p>タイムラインを読み込んでいます...</p>
              </div>
            )}
            {error && <div className="text-center py-10 text-red-400">読み込みに失敗しました。</div>}
            {items && items.map((item) => {
              if (item.item_type === 'comment') {
                return (
                  <div key={`comment-${item.id}`} className="bg-gray-800/50 border border-gray-800 p-4 rounded-xl">
                    <div className="flex items-start space-x-4">
                      <Link href={`/profile/${item.user_id}`} className="flex-shrink-0 cursor-pointer"><AvatarIcon avatarUrlPath={item.profiles?.avatar_url} size={40} /></Link>
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-2">
                          <Link href={`/profile/${item.parent_post?.user_id}`} className="font-bold text-pink-400 hover:underline">
                            {(Array.isArray(item.parent_post?.profiles) && item.parent_post.profiles[0]?.username) || '匿名さん'}
                          </Link>
                          <span>さんへのコメント</span>
                        </div>
                        <div className="flex items-baseline space-x-2">
                          <p className="font-bold">{item.profiles?.username || '匿名さん'}</p>
                          <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString('ja-JP')}</p>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words">{item.content}</p>
                      </div>
                    </div>
                  </div>
                )
              }

              // 通常の投稿
              const post = item;
              return (
                <div key={post.id} id={post.id}>
                  <div className="bg-gray-800/50 border border-gray-800 p-4 rounded-xl">
                    <div className="flex items-start space-x-4">
                      <Link href={`/profile/${post.user_id}`} className="flex-shrink-0 cursor-pointer"><AvatarIcon avatarUrlPath={post.profiles?.avatar_url} size={40} /></Link>
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
                          <button onClick={() => setCommentingPostId(commentingPostId === post.id ? null : post.id)} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
                            <FaRegComment />
                            <span className="text-xs">{post.comments.length}</span>
                          </button>

                          {/* メニューボタン */}
                          <div className="relative" ref={openMenuPostId === post.id ? menuRef : null}>
                            <button onClick={() => setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            {/* ドロップダウンメニュー */}
                            {openMenuPostId === post.id && (
                              <div className="absolute right-0 mt-2 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-10">
                                {user && user.id === post.user_id && (
                                  <button onClick={() => { setOpenMenuPostId(null); handleDelete(post.id); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700">
                                    削除
                                  </button>
                                )}
                                <button onClick={() => { alert('この機能は現在準備中です。'); setOpenMenuPostId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                                  通報
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {commentingPostId === post.id && (
                    <div className="pl-10 pr-4 -mt-2 mb-2">
                      {/* コメント一覧 */}
                      <div className="space-y-3 mt-4 border-t border-gray-700 pt-4">
                        {post.comments.map(comment => (
                          <div key={comment.id} className="flex items-start space-x-3 pl-2">
                            <Link href={`/profile/${comment.user_id}`} className="flex-shrink-0"><AvatarIcon avatarUrlPath={comment.profiles?.avatar_url} size={32}/></Link>
                            <div className="flex-1 bg-gray-700/50 rounded-lg px-3 py-2">
                              <p className="text-sm font-bold">{comment.profiles?.username || '匿名さん'}</p>
                              <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap break-words">{comment.content}</p>
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
                          onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                        />
                        <button onClick={() => handleComment(post.id)} className="text-pink-500 hover:text-pink-400 disabled:opacity-50" disabled={!newCommentContent.trim()}>送信</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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

  return {
    props: {
      // initialItemsはSWRで取得するため、空の配列を渡すか、何も渡さない
    },
  };
};