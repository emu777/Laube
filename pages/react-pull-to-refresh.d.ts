declare module 'react-pull-to-refresh' {
  import * as React from 'react';

  interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
  }

  const PullToRefresh: React.FC<PullToRefreshProps>;
  export default PullToRefresh;
}