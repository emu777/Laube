declare module 'react-swipeable-list' {
  import { ReactNode, ComponentType } from 'react';

  export interface SwipeableListItemProps {
    children: ReactNode;
    swipeLeft?: {
      content: ReactNode;
      action: () => void;
    };
  }

  export const SwipeableListItem: ComponentType<SwipeableListItemProps>;
}
