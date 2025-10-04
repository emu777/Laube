import React, { useState, useRef, TouchEvent, ReactNode } from 'react';
import { FaSpinner } from 'react-icons/fa';

type PullToRefreshProps = {
  onRefresh: () => Promise<any>;
  children: ReactNode;
};

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPulling = useRef(false);

  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    // ページ上部でのみスワイプを開始できるようにする
    if (window.scrollY > 5) return;
    setStartY(e.touches[0].clientY);
    isPulling.current = true;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isPulling.current) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);

    // 抵抗感のある動きを表現
    const dampenedDistance = distance > 0 ? Math.pow(distance, 0.85) : 0;
    setPullDistance(dampenedDistance);
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance > PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(50); // ローディングインジケーターの表示位置
      await onRefresh();
      setRefreshing(false);
      setPullDistance(0);
    } else {
      // スレッショルドに達しなかった場合は、スムーズに元の位置に戻す
      const container = containerRef.current;
      if (container) {
        container.style.transition = 'transform 0.3s';
        container.style.transform = 'translateY(0px)';
        setTimeout(() => {
          container.style.transition = '';
          setPullDistance(0);
        }, 300);
      }
    }
  };

  return (
    <div className="relative">
      {/* スワイプ操作を検知するためのハンドル（透明） */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="absolute top-0 left-0 w-full h-24 z-10"
      />

      {/* インジケーター */}
      <div
        className="absolute top-[-50px] left-0 right-0 flex justify-center items-center h-[50px] text-white z-0"
        style={{
          opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
        }}
      >
        {refreshing ? <FaSpinner className="animate-spin text-2xl" /> : <p className="text-sm">↓</p>}
      </div>

      {/* ページコンテンツ */}
      <div
        ref={containerRef}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: !isPulling.current ? 'transform 0.3s' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
