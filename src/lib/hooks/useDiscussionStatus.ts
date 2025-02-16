import { useEffect, useRef, useState } from 'react'
import { createClient } from "@/utils/supabase/client"
import type { Discussion, UseDiscussionStatusProps } from "@/types"

export function useDiscussionStatus({
  discussionId,
  onDiscussionStart
}: UseDiscussionStatusProps) {
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Keep track of whether we've already triggered the transition
  const hasTriggeredTransition = useRef(false);

  useEffect(() => {
    if (!discussionId) return;

    // Function to verify current discussion status
    const verifyCurrentStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('status')
          .eq('id', discussionId)
          .single();
        
        if (error) throw error;
        
        // If the discussion is already active and we haven't triggered the transition
        if (data.status === 'active' && !hasTriggeredTransition.current) {
          hasTriggeredTransition.current = true;
          onDiscussionStart?.();
        }
      } catch (error) {
        console.error('Error verifying discussion status:', error);
      }
    };

    // Initial status check
    verifyCurrentStatus();

    // Set up realtime subscription with retry logic
    const setupSubscription = async () => {
      try {
        // Clean up existing subscription if any
        if (channelRef.current) {
          await channelRef.current.unsubscribe();
        }

        channelRef.current = supabase
          .channel(`discussion-status-${discussionId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'sessions',
              filter: `id=eq.${discussionId}`
            },
            (payload) => {
              const updatedDiscussion = payload.new as Discussion;
              if (updatedDiscussion.status === 'active' && !hasTriggeredTransition.current) {
                hasTriggeredTransition.current = true;
                onDiscussionStart?.();
              }
            }
          )
          .subscribe((status) => {
            setIsSubscribed(status === 'SUBSCRIBED');
            
            // If subscription fails, retry after a delay
            if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setTimeout(setupSubscription, 5000);
            }
          });
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
        // Retry subscription setup after delay
        setTimeout(setupSubscription, 5000);
      }
    };

    setupSubscription();

    // Periodic status verification as a fallback
    const statusCheckInterval = setInterval(verifyCurrentStatus, 10000);

    return () => {
      clearInterval(statusCheckInterval);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      setIsSubscribed(false);
      // Reset the transition flag when the hook is cleaned up
      hasTriggeredTransition.current = false;
    };
  }, [discussionId, onDiscussionStart]);

  return { isSubscribed };
}