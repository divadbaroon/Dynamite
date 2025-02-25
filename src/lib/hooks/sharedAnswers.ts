import { useEffect, useState } from 'react'
import { createClient } from "@/utils/supabase/client"
import type { SharedAnswers } from "@/types"
import { fetchSharedAnswers } from "@/lib/actions/discussion"
import { PostgrestError } from '@supabase/supabase-js'

interface SharedAnswersResponse {
  data: { answers: SharedAnswers } | null;
  error: PostgrestError | null;
}

export function useSharedAnswers(discussionId?: string, groupId?: string) {
  const [sharedAnswers, setSharedAnswers] = useState<SharedAnswers>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!discussionId || !groupId) {
      setLoading(false)
      return
    }

    const getSharedAnswers = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const result = await fetchSharedAnswers(discussionId, groupId) as SharedAnswersResponse
        
        if (result.error) {
          console.error('Error fetching shared answers:', result.error)
          setError(result.error.message || 'Failed to fetch shared answers')
          return
        }

        if (result.data?.answers && typeof result.data.answers === 'object') {
          setSharedAnswers(result.data.answers)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch shared answers'
        console.error('Unexpected error fetching shared answers:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
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

  return { 
    sharedAnswers, 
    setSharedAnswers,
    loading,
    error
  }
}