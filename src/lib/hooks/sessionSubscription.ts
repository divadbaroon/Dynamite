import { useEffect } from 'react'
import { createClient } from "@/utils/supabase/client"
import type { Discussion, UseSessionSubscriptionProps } from "@/types"

export function useSessionSubscription({
  sessionId,
  currentPointIndex,
  setIsRunning,
  setCurrentPointIndex,
  setOpenItem
}: UseSessionSubscriptionProps) {

  const supabase = createClient();

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const updatedDiscussion = payload.new as Discussion;
          setIsRunning(updatedDiscussion.status === 'active');
          
          if (updatedDiscussion.current_point !== undefined && 
              updatedDiscussion.current_point !== currentPointIndex) {
            setCurrentPointIndex(updatedDiscussion.current_point);
            setOpenItem(`item-${updatedDiscussion.current_point}`);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, currentPointIndex]);
}