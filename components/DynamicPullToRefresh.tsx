import dynamic from 'next/dynamic';
import React from 'react';

// 'react-pull-to-refresh'を、サーバーサイドレンダリング(SSR)を無効にして動的にインポートします。
const PullToRefresh = dynamic(() => import('react-pull-to-refresh'), {
  ssr: false,
});

type DynamicPullToRefreshProps = {
  onRefresh: () => Promise<any>;
  children: React.ReactNode;
};

const DynamicPullToRefresh: React.FC<DynamicPullToRefreshProps> = ({ onRefresh, children }) => {
  // このコンポーネントはクライアントサイドでのみレンダリングされます。
  return <PullToRefresh onRefresh={onRefresh}>{children}</PullToRefresh>;
};

export default DynamicPullToRefresh;
