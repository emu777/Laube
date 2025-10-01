import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import 'react-pull-to-refresh' with SSR turned off.
const PullToRefresh = dynamic(() => import('react-pull-to-refresh'), {
  ssr: false,
});

type DynamicPullToRefreshProps = {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
};

const DynamicPullToRefresh: React.FC<DynamicPullToRefreshProps> = ({ onRefresh, children }) => {
  return <PullToRefresh onRefresh={onRefresh}>{children}</PullToRefresh>;
};

export default DynamicPullToRefresh;
