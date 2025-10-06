import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import type { User } from '@supabase/supabase-js';

type NotificationContextType = {
  unreadCount: number;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const supabase = useSupabase();
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);

  const fetchUnreadCount = useCallback(
    async (currentUser: User | null) => {
      if (!currentUser) {
        setUnreadCount(0);
        return;
      }
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', currentUser.id)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    },
    [supabase]
  );

  useEffect(() => {
    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // `getUser()` を使用して、サーバーで認証された最新のユーザー情報を取得します
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      fetchUnreadCount(user);
    });

    // Realtime subscription
    const channel = supabase
      .channel('realtime notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: user ? `recipient_id=eq.${user.id}` : undefined,
        },
        () => {
          fetchUnreadCount(user);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      authListener.unsubscribe();
    };
  }, [supabase, user, fetchUnreadCount]);

  return <NotificationContext.Provider value={{ unreadCount }}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
