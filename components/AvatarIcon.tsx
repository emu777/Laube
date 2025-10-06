import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useSupabase } from '@/contexts/SupabaseContext';

type AvatarIconProps = {
  avatarUrlPath: string | null | undefined;
  size: number;
  isActive?: boolean;
  priority?: boolean;
};

const AvatarIcon = ({ avatarUrlPath, size, isActive, priority = false }: AvatarIconProps) => {
  const supabase = useSupabase();
  const imageUrl = useMemo(() => {
    if (avatarUrlPath && supabase) {
      if (avatarUrlPath.startsWith('http')) {
        return avatarUrlPath;
      } else {
        return supabase.storage.from('avatars').getPublicUrl(avatarUrlPath).data?.publicUrl ?? null;
      }
    }
    return null;
  }, [avatarUrlPath, supabase]);

  return (
    <div className="relative">
      <div
        className="rounded-full bg-gray-700 overflow-hidden border border-gray-800"
        style={{ width: size, height: size }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="avatar"
            className="w-full h-full object-cover"
            width={size}
            height={size}
            priority={priority}
          />
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
