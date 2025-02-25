'use server'

import { createClient } from '@/utils/supabase/server'

export async function fetchSessionMessages(sessionId: string) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching session messages:', error)
    return { data: null, error }
  }
}