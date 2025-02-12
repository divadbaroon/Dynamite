import { useEffect } from 'react'
import { createClient } from "@/utils/supabase/client"
import type { Discussion, UseDiscussionStatusProps } from "@/types"

export function useDiscussionStatus({
  discussionId,
  onDiscussionStart
}: UseDiscussionStatusProps) {
  const supabase = createClient();

  useEffect(() => {
    if (!discussionId) return;

    const channel = supabase
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
          if (updatedDiscussion.status === 'active') {
            onDiscussionStart?.();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [discussionId, onDiscussionStart]);
}