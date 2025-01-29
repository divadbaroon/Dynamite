"use server"

import { createClient } from '@/utils/supabase/server'
import { BulletPoint, SharedAnswers } from '@/types'

export async function submitAnswers(discussionId: string, groupId: string, userId: string) {
  try {
    const supabase = await createClient()
    
    // Fetch latest shared answers
    const { data: latestSharedAnswers, error: fetchError } = await supabase
      .from('shared_answers')
      .select('*')
      .eq('session_id', discussionId)
      .eq('group_id', groupId)
      .maybeSingle()

    if (fetchError) {
      throw new Error(`Error fetching shared answers: ${fetchError.message}`)
    }

    if (!latestSharedAnswers?.answers) {
      throw new Error('No shared answers found')
    }

    // Filter out deleted items
    const filteredAnswers = Object.entries(latestSharedAnswers.answers).reduce((acc, [key, points]) => {
      const filteredPoints = (points as BulletPoint[]).filter(point => !point.isDeleted)
      if (filteredPoints.length > 0) {
        acc[key] = filteredPoints
      }
      return acc
    }, {} as SharedAnswers)

    // Insert into answers table
    const { error: insertError } = await supabase
      .from('answers')
      .insert({
        answers: filteredAnswers,
        session_id: discussionId,
        user_id: userId,
        submitted_at: new Date().toISOString(),
      })

    if (insertError) {
      throw new Error(`Error inserting answers: ${insertError.message}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error in submitAnswers:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}