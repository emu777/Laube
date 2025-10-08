import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useSupabase } from '@/contexts/SupabaseContext';

type AvatarIconProps = {
  avatarUrlPath: string | null | undefined;
  size: number;
  isActive?: boolean;
  priority?: boolean;
  shape?: 'round' | 'square';
};

const AvatarIcon = ({ avatarUrlPath, size, isActive, priority = false, shape = 'round' }: AvatarIconProps) => {
  return (
    <div className="relative">
      <div
        className={`bg-gray-700 overflow-hidden border border-gray-800 ${shape === 'round' ? 'rounded-full' : 'rounded-none'}`}
        style={{ width: size, height: size }}
      >
        {avatarUrlPath && avatarUrlPath.startsWith('http') ? (
          <Image
            src={avatarUrlPath}
            alt="avatar"
            className="w-full h-full object-cover"
            width={size}
            height={size}
            priority={priority}
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <span className="text-gray-500 font-bold" style={{ fontSize: Math.max(10, size / 6) }}>
              Noimage
            </span>
          </div>
        )}
      </div>
      {isActive && (
        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-gray-800" />
      )}
    </div>
  );
};

export default AvatarIcon;
