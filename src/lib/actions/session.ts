'use server'

import { createClient } from '@/utils/supabase/server'
import { Session } from '@/types'

export async function createSession(data: Omit<Session, 'id' | 'created_at' | 'author'>) {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Not authenticated')
    }

    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert([{
        status: false, 
        title: data.title,
        task: data.task,
        scenario: data.scenario,
        discussion_points: data.discussion_points,
        author: user.id,
        participant_count: 0,
        group_count: 0,
        time_left: data.time_left
      }])
      .select()
      .single()

    if (error) throw error
    
    return { session: newSession, error: null }
  } catch (error) {
    console.error('Error creating session:', error)
    return { session: null, error }
  }
}

export async function getAllSessions() {
  const supabase = await createClient()
  
  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    
    return { sessions, error: null }
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return { sessions: null, error }
  }
}

export async function deleteSession(id: string) {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)

    if (error) throw error
    
    return { error: null }
  } catch (error) {
    console.error('Error deleting session:', error)
    return { error }
  }
}

export async function getSessionById(sessionId: string) {
  const supabase = await createClient()
  
  try {
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')  
      .eq('id', sessionId)
      .single()

    if (error) throw error
    
    return { session, error: null }
  } catch (error) {
    console.error('Error fetching session:', error)
    return { session: null, error }
  }
}