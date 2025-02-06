import { useEffect, useState } from 'react'
import { createClient } from "@/utils/supabase/client"
import type { SharedAnswers } from "@/types"
import { fetchSharedAnswers } from "@/lib/actions/discussion"

export function useSharedAnswers(discussionId?: string, groupId?: string) {
  const [sharedAnswers, setSharedAnswers] = useState<SharedAnswers>({})
  const supabase = createClient()

  useEffect(() => {
    if (!discussionId || !groupId) return

    const getSharedAnswers = async () => {
      const { data, error } = await fetchSharedAnswers(discussionId, groupId)
      
      if (error) {
        console.log('Error fetching shared answers:', error)
      }
      if (data?.answers && typeof data.answers === 'object') {
        setSharedAnswers(data.answers as SharedAnswers)
      }
    }

    getSharedAnswers()

    const channel = supabase
      .channel(`shared-answers-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_answers',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const newAnswers = (payload.new as { answers: SharedAnswers })?.answers
          if (newAnswers && typeof newAnswers === 'object') {
            setSharedAnswers(newAnswers)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [discussionId, groupId])

  return { sharedAnswers, setSharedAnswers }
}