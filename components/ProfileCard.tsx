import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  location: string | null;
  age: number | null;
  hobbies: string[] | null;
  bio: string | null;
};
type ProfileCardProps = { profile: Profile; priority?: boolean };

function ProfileCardComponent({ profile, priority = false }: ProfileCardProps) {
  const supabase = useSupabase();

  // profileオブジェクトと、その中のidが有効な値(空文字列でない)であることを確認します。
  // supabaseクライアントが利用できない場合も何も表示しない
  if (!profile || !profile.id) {
    return null; // or a loading skeleton
  }

  return (
    <Link
      href={{
        pathname: '/profile/[id]',
        query: { id: profile.id },
      }}
      className="block transition-transform duration-200 hover:scale-105"
    >
      <div className="rounded-xl overflow-hidden bg-gray-800/50 border border-gray-700/80 shadow-lg w-[160px]">
        <div className="relative w-full aspect-square">
          {profile.avatar_url ? (
            <Image
              src={(() => {
                if (profile.avatar_url.startsWith('http')) {
                  return profile.avatar_url;
                }
                return supabase ? supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl : '';
              })()}
              alt="avatar"
              className="w-full h-full object-cover"
              fill
              priority={priority}
              sizes="150px"
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          {/* 名前 */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
            <p className="m-0 text-xs font-bold truncate text-white text-right">{profile.username || '未設定'}</p>
          </div>
        </div>
        <div className="p-2.5 text-center">
          <p className="m-0 text-xs text-gray-400">
            {profile.location || '未設定'}・{profile.age || '??'}歳
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 justify-center min-h-[58px] px-2">
            {profile.hobbies?.slice(0, 3).map((hobby: string) => (
              <span key={hobby} className="bg-gray-700/80 text-gray-300 text-xs font-medium px-2 py-0.5 rounded-full">
                {hobby}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

const ProfileCard = React.memo(ProfileCardComponent);
ProfileCard.displayName = 'ProfileCard';

export default ProfileCard;
