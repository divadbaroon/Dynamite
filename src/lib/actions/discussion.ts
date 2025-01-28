'use server'

import { createClient } from '@/utils/supabase/server'
import { Discussion, SharedAnswers } from '@/types'

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
    console.log('Error creating discussion:', error)
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
    console.log('Error fetching discussions:', error)
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
    console.log('Error deleting discussion:', error)
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
    console.log('Error fetching discussion:', error)
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
    console.log('Error updating discussion status:', error)
    return { discussion: null, error }
  }
}

export async function fetchSharedAnswers(discussionId: string, groupId: string) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('shared_answers')
      .select('*')
      .eq('session_id', discussionId)
      .eq('group_id', groupId)
      .maybeSingle()

    if (error) throw error
    
    return { data, error: null }
  } catch (error) {
    console.log('Error fetching shared answers:', error)
    return { data: null, error }
  }
}

export async function deleteAnswerPoint(
  discussionId: string, 
  groupId: string, 
  pointIndex: number, 
  bulletIndex: number,
  updatedAnswers: SharedAnswers
) {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase
      .from('shared_answers')
      .upsert({
        session_id: discussionId,
        group_id: groupId,
        answers: updatedAnswers,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'session_id,group_id'
      })

    if (error) throw error
    
    return { error: null }
  } catch (error) {
    console.log('Error deleting answer point:', error)
    return { error }
  }
}

export async function saveAnswerEdit(
  discussionId: string,
  groupId: string,
  updatedAnswers: SharedAnswers
) {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase
      .from('shared_answers')
      .upsert({
        session_id: discussionId,
        group_id: groupId,
        answers: updatedAnswers,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'session_id,group_id'
      })

    if (error) throw error
    
    return { error: null }
  } catch (error) {
    console.log('Error saving answer edit:', error)
    return { error }
  }
}

interface SubmitAnswersResponse {
  error: Error | null;
}

export async function submitAnswers(
  discussionId: string,
  userId: string,
  answers: SharedAnswers
): Promise<SubmitAnswersResponse> {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase
      .from('answers')
      .insert([{
        session_id: discussionId,
        user_id: userId,
        answers: answers,
        submitted_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    
    return { error: null };
  } catch (error) {
    console.log('Error submitting answers:', error);
    return { error: error as Error };
  }
}

export async function updateCurrentPoint(discussionId: string, currentPoint: number) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('sessions')
      .update({ current_point: currentPoint })
      .eq('id', discussionId)
      .select()
      .single()

    if (error) throw error
    
    return { data, error: null }
  } catch (error) {
    console.log('Error updating current point:', error)
    return { data: null, error }
  }
}

export async function updateMessageWithAudioAndPoint(
  discussionId: string,
  userId: string,
  transcript: string,
  pitchedUrl: string
) {
  const supabase = await createClient();

  try {
    // 1) Fetch the current_point from the 'sessions' table
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('current_point')
      .eq('id', discussionId)
      .single();

    if (sessionError) {
      throw sessionError;
    }
    const currentPoint = sessionData?.current_point ?? 0;

    // 2) Update the latest matching message row
    //    filtering by content, user_id, and session_id
    const { error: updateError } = await supabase
      .from('messages')
      .update({ 
        audio_url: pitchedUrl,
        current_point: currentPoint
      })
      .eq('content', transcript)
      .eq('user_id', userId)
      .eq('session_id', discussionId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (updateError) {
      throw updateError;
    }

    return { error: null };
  } catch (error) {
    console.log('Error updating message with audio & current_point:', error);
    return { error };
  }
}
