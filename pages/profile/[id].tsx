import { GetServerSidePropsContext, NextPage } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'

type Profile = {
  id: string
  username: string | null
  avatar_url: string | null
  location: string | null
  age: number | null
  sexualities: string[] | null
  position: string | null
  drinking: string | null
  smoking: string | null
  bio: string | null
  hobbies: string[] | null;
  partner_status: string | null;
  marital_status: string | null;
  dating_experience: string | null;
  mbti: string | null;
}

type ProfilePageProps = {
  profile: Profile | null
  isLiked: boolean
  isLikedBy: boolean
  isMyProfile: boolean
}

const ProfilePage: NextPage<ProfilePageProps> = ({ profile, isLiked: initialIsLiked, isLikedBy, isMyProfile }) => {
  const supabase = useSupabaseClient()
  const user = useUser()
  const router = useRouter()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  useEffect(() => {
    if (profile?.avatar_url) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url)
      setAvatarUrl(data.publicUrl)
    }
  }, [profile, supabase])

  const createChatRoom = async () => {
    if (!user || !profile) return;

    // To prevent duplicate rooms, always store the smaller ID in user1_id
    const user1 = user.id < profile.id ? user.id : profile.id;
    const user2 = user.id > profile.id ? user.id : profile.id;

    const { data } = await supabase
      .from('chat_rooms')
      .insert({ user1_id: user1, user2_id: user2 })
      .select()
      .single()
      .then(({ data: roomData, error: roomError }) => {
        if (roomError && roomError.code !== '23505') throw roomError;
        // If the room already exists, find it
        return roomData || supabase.from('chat_rooms').select('id').eq('user1_id', user1).eq('user2_id', user2).single().then(res => res.data);
      });

    if (data?.id) {
      router.push(`/chat/${data.id}`);
    }
  };

  const handleLike = async () => {
    if (!user || !profile || isMyProfile) return

    if (isLiked) {
      // いいねを取り消す
      const { error } = await supabase.from('likes').delete().match({ liker_id: user.id, liked_id: profile.id })
      if (error) {
        console.error('Error unliking profile:', error)
      } else {
        setIsLiked(false)
      }
    } else {
      // いいねする (マッチング成立かチェック)
      const { error } = await supabase.from('likes').insert({ liker_id: user.id, liked_id: profile.id })
      if (error) {
        console.error('Error liking profile:', error)
      } else {
        setIsLiked(true)
        if (isLikedBy) {
          // 相手も自分をいいねしていたらマッチング成立
          await createChatRoom();
        }
      }
    }
  }

  const handleMatch = async () => {
    if (!user || !profile || isMyProfile) return;
    // 念のため、自分のいいねも作成する
    await supabase.from('likes').upsert({ liker_id: user.id, liked_id: profile.id });
    setIsLiked(true);
    await createChatRoom();
  };

  const executeReject = async () => {
    if (!user || !profile || isMyProfile) return;

    // 1. 相手からのいいねを削除
    const { error: deleteLikeError } = await supabase.from('likes').delete().match({ liker_id: profile.id, liked_id: user.id });
    if (deleteLikeError) {
      console.error('Error rejecting like:', deleteLikeError);
      alert('処理に失敗しました。');
      return;
    }

    // 3. 既存のチャットルームがあれば削除
    const user1 = user.id < profile.id ? user.id : profile.id;
    const user2 = user.id > profile.id ? user.id : profile.id;
    const { error: deleteRoomError } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('user1_id', user1)
      .eq('user2_id', user2);
    if (deleteRoomError) {
      console.error('Error deleting chat room:', deleteRoomError);
    }

    // 2. 相互ブロックのデータを作成
    const { error: blockError } = await supabase.rpc('create_mutual_block', {
      p_blocker_id: user.id,
      p_blocked_id: profile.id,
    });
    if (blockError) {
      console.error('Error creating block:', blockError);
      // いいね削除は成功しているので、エラーが出ても続行する
    }

    alert('相手をブロックしました。');
    router.push('/');
  };

  if (!profile) {
    return (
      <div className="bg-gray-900 min-h-screen text-white">
        <Header />
        <main className="p-4 pt-24 text-center">
          <p>ユーザーが見つかりませんでした。</p>
          <Link href="/" className="text-blue-400 hover:underline">
            一覧に戻る
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
      <Header />
      <main className="p-4 pt-20 sm:pt-24 pb-24">
        <div className="w-full max-w-md mx-auto bg-gray-800 rounded-xl sm:p-6 space-y-6 relative">
          {/* 閉じるボタン */}
          <button onClick={() => router.back()} className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-gray-700/80 rounded-full p-2 text-white hover:bg-gray-600/80 transition-colors z-10" aria-label="閉じる">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="w-full mx-auto aspect-[4/5] max-h-[500px] sm:max-h-[640px] sm:rounded-xl overflow-hidden shadow-lg">
            <div className="relative w-full h-full">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="avatar"
                  className="w-full h-full object-cover"
                  fill
                  sizes="(max-width: 640px) 100vw, 448px"
                  priority
                />
                ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-400 text-2xl">No image</span>
                </div>
                )}

              {/* 名前・居住地・年齢 */}
              <div className="absolute bottom-0 left-0 p-4 text-white bg-gradient-to-t from-black/70 to-transparent w-full">
                <h1 className="text-xl font-bold drop-shadow-md">{profile.username || '未設定'}</h1>
                <div className="text-gray-200 text-xs drop-shadow-md mt-1">
                  {(profile.location || profile.age) && (
                    <>
                      <span>{profile.location || '未設定'}</span>
                      {profile.location && profile.age && <span className="mx-1">/</span>}
                      {profile.age && <span>{profile.age}歳</span>}
                    </>
                  )}
                </div>
                <div className="text-gray-200 text-xs drop-shadow-md mt-1">
                  {(profile.sexualities && profile.sexualities.length > 0 || profile.position) && (
                    <>
                      <span>{profile.sexualities?.join(' / ') || '未設定'}</span>
                      {profile.sexualities && profile.sexualities.length > 0 && profile.position && <span className="mx-1">/</span>}
                      {profile.position && <span>{profile.position}</span>}
                    </>
                  )}
                </div>
              </div>

              {/* いいねボタン */}
              {!isMyProfile && (
                <div className="absolute bottom-4 right-4">
                  <button
                    onClick={handleLike}
                    className={`w-16 h-16 rounded-full transition-all duration-300 ease-in-out transform active:scale-95 flex items-center justify-center border-4 border-gray-800 shadow-xl ${
                      isLiked
                        ? 'bg-pink-500 text-white'
                        : 'bg-white text-pink-500 hover:bg-pink-50'
                    }`}
                    aria-label={isLiked ? 'いいねを取り消す' : 'いいねする'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8"
                      fill={isLiked ? 'currentColor' : 'none'}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.5l1.318-1.182a4.5 4.5 0 116.364 6.364L12 20.25l-7.682-7.682a4.5 4.5 0 010-6.364z"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {profile.hobbies && profile.hobbies.length > 0 && (
            <>
              <div className="border-t border-white/10 my-4" />
              <div className="flex flex-wrap gap-2 justify-center">
                {profile.hobbies.map(hobby => (
                  <span key={hobby} className="bg-gray-700 text-gray-300 text-xs font-semibold px-2.5 py-1 rounded-full">{hobby}</span>
                ))}
              </div>
            </>
          )}

          {profile.bio && (
            <>
              <div className="border-t border-white/10 my-4" />
              <p className="text-sm text-center whitespace-pre-wrap leading-relaxed text-gray-300">{profile.bio}</p>
            </>
          )}

          <div className="border-t border-white/10 my-4" />

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {profile.partner_status && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">恋人</span>
                <span className="font-semibold text-white">{profile.partner_status}</span>
              </div>
            )}
            {profile.marital_status && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">結婚・子供</span>
                <span className="font-semibold text-white">{profile.marital_status}</span>
              </div>
            )}
            {profile.dating_experience && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">女性との交際歴</span>
                <span className="font-semibold text-white">{profile.dating_experience}</span>
              </div>
            )}
            {profile.mbti && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">MBTI</span>
                <span className="font-semibold text-white">{profile.mbti}</span>
              </div>
            )}
            {profile.drinking && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">お酒</span>
                <span className="font-semibold text-white">{profile.drinking}</span>
              </div>
            )}
            {profile.smoking && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">タバコ</span>
                <span className="font-semibold text-white">{profile.smoking}</span>
              </div>
            )}
          </div>

          {/* マッチングボタン */}
          {isLikedBy && !isLiked && !isMyProfile && (
            <div className="pt-4 space-y-3">
              <p className="text-center text-pink-400 text-sm">相手はあなたに興味を持っています！</p>
              <button onClick={handleMatch} className="w-full p-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold rounded-lg hover:opacity-90 transition-opacity">
                両想いになる
              </button>
              <button onClick={() => setShowRejectConfirm(true)} className="w-full p-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">
                拒否する
              </button>
            </div>
          )}

        </div>
      </main>

      {/* 拒否確認モーダル */}
      {showRejectConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm text-center shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white">確認</h2>
            <p className="text-sm text-gray-300">
              今後このユーザーとは繋がれなくなります。本当によろしいですか？
            </p>
            <div className="flex gap-4 pt-2">
              <button onClick={() => setShowRejectConfirm(false)} className="w-full p-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-colors">もう少し考える</button>
              <button onClick={executeReject} className="w-full p-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">はい</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default ProfilePage

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } }
  }

  const { id } = ctx.params as { id: string }
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !profile) {    
    return { props: { profile: null, isLiked: false, isLikedBy: false, isMyProfile: false } }
  }

  const isMyProfile = session.user.id === profile.id
  let isLiked = false
  let isLikedBy = false

  if (!isMyProfile) {
    // 自分が相手をいいねしているか
    const { count: likeCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('liker_id', session.user.id)
      .eq('liked_id', profile.id)
    isLiked = (likeCount ?? 0) > 0;

    // 相手が自分をいいねしているか
    const { count: likedByCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('liker_id', profile.id)
      .eq('liked_id', session.user.id)
    isLikedBy = (likedByCount ?? 0) > 0;
  }

  return {
    props: { profile, isLiked, isLikedBy, isMyProfile },
  }
}
