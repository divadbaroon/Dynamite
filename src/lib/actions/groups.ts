'use server'

import { createClient } from '@/utils/supabase/server'

export async function fetchGroupsBySession(sessionId: string) {
  const supabase = await createClient()
  
  try {
    // This exactly matches your SQL query
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('session_id', sessionId)
    
    if (error) throw error
    
    // Log results for debugging
    console.log(`fetchGroupsBySession results: Found ${data?.length || 0} groups for session ${sessionId}`)
    
    // If you have data, log a sample to verify it's correct
    if (data && data.length > 0) {
      console.log("Sample group:", data[0])
    }
    
    return { data, error: null }
  } catch (error) {
    console.error('Error in fetchGroupsBySession:', error)
    return { data: null, error }
  }
}