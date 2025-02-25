'use server'

import { createClient } from '@/utils/supabase/server'
import { SharedAnswers } from '@/types'

export async function fetchSessionSharedAnswers(sessionId: string) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('shared_answers')
      .select('*')
      .eq('session_id', sessionId)
      .order('last_updated', { ascending: false })

    if (error) throw error

    // Transform data into a more useful format
    const formattedData = data?.reduce((acc: Record<string, SharedAnswers>, item) => {
      acc[item.group_id] = item.answers
      return acc
    }, {})
    
    return { 
      data: formattedData,
      rawData: data,
      error: null 
    }
  } catch (error) {
    console.error('Error fetching session shared answers:', error)
    return { data: null, rawData: null, error }
  }
}