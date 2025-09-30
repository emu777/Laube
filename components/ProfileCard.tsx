import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import Image from 'next/image';
import Link from 'next/link';

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  location: string | null;
  age: number | null;
  hobbies: string[] | null;
}

const ProfileCard = ({ profile }: { profile: Profile }) => {
  const supabase = useSupabaseClient();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile.avatar_url) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
      setAvatarUrl(data.publicUrl);
    }
  }, [profile.avatar_url, supabase]);

  return (
    <Link href={`/profile/${profile.id}`} className="block transition-transform duration-200 hover:scale-105">
      <div className="rounded-xl overflow-hidden bg-gray-800/50 border border-gray-700/80 shadow-lg w-[160px]">
        <div className="relative w-full aspect-square">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="avatar"
              className="w-full h-full object-cover"
              fill
              sizes="160px"
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
          {profile.hobbies && profile.hobbies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 justify-center">
              {profile.hobbies.slice(0, 3).map(hobby => (
                <span key={hobby} className="bg-gray-700/80 text-gray-300 text-xs font-medium px-2.5 py-1 rounded-full">
                  {hobby}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
export default ProfileCard;