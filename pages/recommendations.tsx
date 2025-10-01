import { GetServerSidePropsContext, NextPage } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import useSWR from 'swr';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import AvatarIcon from '@/components/AvatarIcon';

type Recommendation = {
  id: string;
  user_id: string;
  youtube_url: string;
  comment: string | null;
  category: string | null;
  created_at: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
};

const getYouTubeVideoId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    }
    return null;
  } catch (error) {
    return null;
  }
};

const RecommendationsPage: NextPage = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const [newUrl, setNewUrl] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetcher = useCallback(async () => {
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

    // 2. オススメを取得 (ブロックしたユーザーは除外)
    let recommendationsQuery = supabase
      .from('recommendations')
      .select('*, category, profiles(username, avatar_url)')
      .order('created_at', { ascending: false });
    if (blockedUserIds.size > 0) {
      recommendationsQuery = recommendationsQuery.not('user_id', 'in', `(${Array.from(blockedUserIds).join(',')})`);
    }
    const { data, error } = await recommendationsQuery;
    if (error) throw error;
    return data || [];
  }, [supabase, user]);

  const { data: recommendations, error, isLoading } = useSWR<Recommendation[]>('recommendations', fetcher);

  const handlePost = async () => {
    if (!newUrl.trim() || !user) {
      alert('オススメしたいYouTubeのURLを入力してください。');
      return;
    }
    if (!getYouTubeVideoId(newUrl)) {
      alert('有効なYouTubeのURLを入力してください。（ショート動画は投稿出来ません）');
      return;
    }
    if (!newCategory) {
      alert('動画のカテゴリを選択してください。');
      return;
    }

    const { error } = await supabase
      .from('recommendations')
      .insert({ youtube_url: newUrl, comment: newComment, category: newCategory, user_id: user.id });

    if (error) {
      console.error('Error creating recommendation:', error);
    } else {
      setNewUrl('');
      setNewComment('');
      setNewCategory('');
      setIsFormOpen(false);
      router.replace(router.asPath);
    }
  };

  const categories = [
    'すべて',
    '音楽',
    '動物',
    'ゲーム',
    '映画',
    'お笑い',
    '美容',
    '日常',
    'エンタメ',
    '学習',
    'その他',
  ];
  const [filterCategory, setFilterCategory] = useState('すべて');

  const filteredRecommendations = recommendations?.filter((rec) => {
    if (filterCategory === 'すべて') return true;
    return rec.category === filterCategory;
  });

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
      <Header />
      <main className="p-4 pt-24 pb-24">
        <div className="w-full max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">オススメ</h1>

          {/* カテゴリフィルター */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                  filterCategory === category ? 'bg-pink-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* 投稿一覧 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading && <p>読み込み中...</p>}
            {error && <p className="text-red-400">読み込みに失敗しました。</p>}{filteredRecommendations &&
              filteredRecommendations.map((rec) => {
                const videoId = getYouTubeVideoId(rec.youtube_url);
                return videoId ? (
                  <div
                    key={rec.id}
                    className="bg-gray-800/50 border border-gray-800 rounded-xl overflow-hidden shadow-md"
                  >
                    <div className="aspect-video">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <div className="p-4">
                      {rec.category && (
                        <span className="inline-block bg-gray-700 text-gray-300 text-xs font-semibold px-2 py-1 rounded-full mb-2">
                          {rec.category}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <Link href={`/profile/${rec.user_id}`}>
                          <AvatarIcon avatarUrlPath={rec.profiles?.avatar_url} size={24} />
                        </Link>
                        <Link
                          href={`/profile/${rec.user_id}`}
                          className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          <span>{rec.profiles?.username || '匿名さん'}</span>
                          <span>のオススメ</span>
                        </Link>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap mt-2">{rec.comment}</p>
                    </div>
                  </div>
                ) : null;
              })}
          </div>
        </div>
      </main>

      {/* 投稿フォームモーダル */}
      {isFormOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setIsFormOpen(false)}
        >
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">お気に入りを共有</h2>
              <div>
                <input
                  type="url"
                  className="w-full bg-gray-700/50 p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder-gray-400 text-white"
                  placeholder="YouTubeの動画URL"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1.5 px-1">※ショート動画は投稿出来ません</p>
              </div>
              <div className="relative">
                <select
                  className="w-full bg-gray-700/50 p-3 rounded-lg border border-gray-600 appearance-none focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-white"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  required
                >
                  <option value="">カテゴリを選択</option>
                  {categories
                    .filter((c) => c !== 'すべて')
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
              <textarea
                className="w-full bg-gray-700/50 p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder-gray-400 text-white"
                rows={3}
                placeholder="コメント (任意)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
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
                  className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded-full transition-colors"
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
        aria-label="新しいオススメを投稿"
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

      <BottomNav />
    </div>
  );
};

export default RecommendationsPage;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  return {
    props: {},
  };
};
