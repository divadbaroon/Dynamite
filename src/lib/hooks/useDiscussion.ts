import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SharedAnswers } from '@/types'
import { analyzeTranscript } from '@/lib/actions/transcript'

import { UseRealtimeDiscussionProps, RealtimeState,  } from "@/types"

export function useDiscussion({ groupId, sessionId }: UseRealtimeDiscussionProps) {
  const supabase = createClient()
  const [state, setState] = useState<RealtimeState>({
    messages: [],
    sharedAnswers: null,
    currentPoint: 0,
    lastAnalysis: null
  })

  useEffect(() => {

    // Fetching initial data
    const fetchInitialData = async () => {
      const [messagesResponse, answersResponse, sessionResponse] = await Promise.all([
        supabase
          .from('messages')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: true }),
        supabase
          .from('shared_answers')
          .select('*')
          .eq('session_id', sessionId)
          .eq('group_id', groupId)
          .single(),
        supabase
          .from('sessions')
          .select('current_point')
          .eq('id', sessionId)
          .single()
      ])

      setState(prev => ({
        ...prev,
        messages: messagesResponse.data || [],
        sharedAnswers: answersResponse.data?.answers || null,
        currentPoint: sessionResponse.data?.current_point || 0
      }))
    }

    fetchInitialData()

    // realtime message subscriptions
    const messagesSubscription = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            setState(prev => ({
              ...prev,
              messages: [...prev.messages, payload.new],
              lastAnalysis: new Date()
            }))
          }
        }
      )
      .subscribe()

    // realtime shared answers subscriptions
    const answersSubscription = supabase
      .channel('answers-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shared_answers',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          setState(prev => ({
            ...prev,
            sharedAnswers: payload.new.answers
          }))
        }
      )
      .subscribe()

    // realtime session subscriptions
    const sessionSubscription = supabase
      .channel('session-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          setState(prev => ({
            ...prev,
            currentPoint: payload.new.current_point
          }))
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(messagesSubscription)
      supabase.removeChannel(answersSubscription)
      supabase.removeChannel(sessionSubscription)
    }
  }, [groupId, sessionId])

  // Trigger analysis only when needed
  useEffect(() => {
    const ANALYSIS_COOLDOWN = 5000 // 5 seconds cooldown
    
    const shouldAnalyze = () => {
      if (!state.lastAnalysis) return true
      const timeSinceLastAnalysis = new Date().getTime() - state.lastAnalysis.getTime()
      return timeSinceLastAnalysis >= ANALYSIS_COOLDOWN
    }

    const runAnalysis = async () => {
      if (state.messages.length > 0 && shouldAnalyze()) {
        try {
          const result = await analyzeTranscript(groupId, sessionId)
          if (!result.success) {
            console.log('Transcript analysis failed:', result.error)
          }
        } catch (error) {
          console.log('Error running transcript analysis:', error)
        }
      }
    }

    runAnalysis()
  }, [state.messages, groupId, sessionId, state.lastAnalysis])

  return {
    messages: state.messages,
    sharedAnswers: state.sharedAnswers,
    currentPoint: state.currentPoint
  }
}