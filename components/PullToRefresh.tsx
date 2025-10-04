import React, { useState, useRef, TouchEvent, ReactNode } from 'react';
import { FaSpinner } from 'react-icons/fa';

type PullToRefreshProps = {
  onRefresh: () => Promise<any>;
  children: ReactNode;
};

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    // ページが一番上にスクロールされている時のみ処理を開始
    if (window.scrollY === 0) {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      isDragging.current = true;
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;

    const touchMove = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };

    const deltaX = Math.abs(touchMove.x - touchStart.current.x);
    const deltaY = touchMove.y - touchStart.current.y;

    // 垂直方向へのスワイプが明確な場合のみプルを開始
    if (deltaY > 10 && deltaY > deltaX) {
      e.preventDefault(); // ページのスクロールを止める
      const distance = Math.max(0, deltaY);
      const dampenedDistance = Math.pow(distance, 0.85);
      setPullDistance(dampenedDistance);
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (pullDistance > PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(50);
      await onRefresh();
      setRefreshing(false);
      setPullDistance(0);
    } else {
      setPullDistance(0);
    }
    touchStart.current = { x: 0, y: 0 };
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        className="text-center h-12 pt-2"
        style={{ marginTop: -48, opacity: Math.min(pullDistance / PULL_THRESHOLD, 1) }}
      >
        {refreshing && <FaSpinner className="animate-spin text-2xl inline-block" />}
      </div>
      <div ref={containerRef} style={{ transform: `translateY(${pullDistance}px)`, transition: 'transform 0.3s' }}>
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
