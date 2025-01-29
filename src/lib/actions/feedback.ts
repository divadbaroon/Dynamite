'use server'

import { createClient } from '@/utils/supabase/server'
import { Ratings } from '@/types'

export async function submitFeedback(
  userId: string | null, 
  sessionId: string, 
  groupId: string, 
  ratings: Ratings, 
  feedback: string
) {
  if (!sessionId || !groupId) {
    return { success: false, error: 'Session ID and Group ID are required' }
  }

  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('feedback')
      .insert({
        user_id: userId,
        session_id: sessionId,
        group_id: groupId,
        usability_rating: ratings.usability,
        content_rating: ratings.content,
        overall_rating: ratings.overall,
        comments: feedback,
        submitted_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to submit feedback' 
    }
  }
}