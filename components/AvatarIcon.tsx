import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSupabase } from '@/pages/_app';

type AvatarIconProps = {
  avatarUrlPath: string | null | undefined;
  size: number;
  isActive?: boolean;
};

const AvatarIcon = ({ avatarUrlPath, size, isActive }: AvatarIconProps) => {
  const supabase = useSupabase();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (avatarUrlPath) {
      if (avatarUrlPath.startsWith('http')) {
        setImageUrl(avatarUrlPath);
      } else {
        const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrlPath);
        setImageUrl(data.publicUrl);
      }
    }
  }, [avatarUrlPath, supabase]);

  return (
    <div className="relative">
      <div
        className="rounded-full bg-gray-700 overflow-hidden border border-gray-800"
        style={{ width: size, height: size }}
      >
        {imageUrl ? (
          <Image src={imageUrl} alt="avatar" className="w-full h-full object-cover" width={size} height={size} />
        ) : (
          <div className="w-full h-full bg-gray-700" />
        )}
      </div>
      {isActive && (
        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-gray-800" />
      )}
    </div>
  );
};

export default AvatarIcon;
