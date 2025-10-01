import React, { useState, useRef, TouchEvent } from 'react';
import { FaSpinner } from 'react-icons/fa';

type PullToRefreshProps = {
  onRefresh: () => Promise<any>;
  children: React.ReactNode;
};

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
      setPulling(true);
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!pulling || !containerRef.current || containerRef.current.scrollTop !== 0) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    setPullDistance(distance);
  };

  const handleTouchEnd = async () => {
    if (!pulling) return;

    if (pullDistance > PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(60); // ローディングインジケーターを表示する位置
      await onRefresh();
      setRefreshing(false);
      setPullDistance(0);
    } else {
      setPullDistance(0);
    }
    setPulling(false);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', height: '100%' }}
    >
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: refreshing || pulling ? 'none' : 'transform 0.3s',
        }}
      >
        <div className="absolute top-[-60px] left-0 right-0 flex justify-center items-center h-[60px] text-white">
          {refreshing ? (
            <FaSpinner className="animate-spin text-2xl" />
          ) : (
            <svg
              className="w-6 h-6 transition-transform"
              style={{ transform: `rotate(${pullDistance * 2}deg)` }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
