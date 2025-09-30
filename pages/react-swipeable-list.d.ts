declare module 'react-swipeable-list' {
  import { ReactNode } from 'react';

  export function useSwipeableList(): {
    getSwipeableItemProps: (itemId: string | number) => Record<string, unknown>;
    parentSwipeableListProps: {
      closeSwipedItem: () => void;
      [key: string]: unknown;
    };
  };

  // NOTE: 以下は既存の型との互換性を保つための仮の定義です
  export const SwipeableList: (props: { children: ReactNode; fullSwipe?: boolean; [key: string]: unknown }) => JSX.Element;
  export const SwipeableListItem: (props: { children: ReactNode; trailingActions?: ReactNode; [key: string]: unknown }) => JSX.Element;
  export const SwipeAction: (props: { children: ReactNode; destructive?: boolean; onClick: (args: { close: () => void }) => void; }) => JSX.Element;
  export const TrailingActions: (props: { children: ReactNode }) => JSX.Element;
}