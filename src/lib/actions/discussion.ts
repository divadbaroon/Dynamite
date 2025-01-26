'use server'

import { createClient } from '@/utils/supabase/server'
import { Discussion } from '@/types'

export async function createDiscussion(data: Omit<Discussion, 'id' | 'created_at' | 'author'>) {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Not authenticated')
    }

    const { data: newDiscussion, error } = await supabase
      .from('sessions')
      .insert([{
        status: data.status, 
        title: data.title,
        task: data.task,
        scenario: data.scenario,
        discussion_points: data.discussion_points,
        author: user.id,
        participant_count: 0,
        group_count: 0,
        time_left: data.time_left,
        current_point: 0
      }])
      .select()
      .single()

    if (error) throw error
    
    return { discussion: newDiscussion, error: null }
  } catch (error) {
    console.error('Error creating discussion:', error)
    return { discussion: null, error }
  }
}

export async function getAllDiscussions() {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Not authenticated')
    }

    const { data: discussions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('author', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    return { discussions, error: null }
  } catch (error) {
    console.error('Error fetching discussions:', error)
    return { discussions: null, error }
  }
}

export async function deleteDiscussion(id: string) {
  const supabase = await createClient()
  
  try {
    // First, delete all related shared_answers
    const { error: answersError } = await supabase
      .from('shared_answers')
      .delete()
      .eq('session_id', id)

    if (answersError) throw answersError

    // Then delete the session
    const { error: sessionError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)

    if (sessionError) throw sessionError
    
    return { error: null }
  } catch (error) {
    console.error('Error deleting discussion:', error)
    return { error }
  }
}

export async function getDiscussionById(discussionId: string) {
  const supabase = await createClient()
  
  try {
    const { data: discussion, error } = await supabase
      .from('sessions')
      .select('*')  
      .eq('id', discussionId)
      .single()

    if (error) throw error
    
    return { discussion, error: null }
  } catch (error) {
    console.error('Error fetching discussion:', error)
    return { discussion: null, error }
  }
}

export async function updateDiscussionStatus(discussionId: string, status: 'draft' | 'active' | 'completed') {
  const supabase = await createClient()
  
  try {
    const { data: discussion, error } = await supabase
      .from('sessions')
      .update({ status })
      .eq('id', discussionId)
      .select()
      .single()

    if (error) throw error
    
    return { discussion, error: null }
  } catch (error) {
    console.error('Error updating discussion status:', error)
    return { discussion: null, error }
  }
}