import { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import type { User, SupabaseClient } from '@supabase/supabase-js';

export const useUser = (): { user: User | null; supabase: SupabaseClient | null; isLoading: boolean } => {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    const fetchSession = async () => {
      // 最初に現在のセッションからユーザー情報を取得
      const {
        data: { session },
      } = await supabase!.auth.getSession();
      if (isMounted) {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    };

    fetchSession();

    const { data: authListener } = supabase!.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, supabase, isLoading };
};
