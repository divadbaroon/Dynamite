'use server'

import { createClient } from '@/utils/supabase/server'
import { SharedAnswers, DiscussionPoint, CreateDiscussionInput, BulletPoint } from '@/types'

export async function createDiscussion(data: CreateDiscussionInput) {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Not authenticated')
    }

    const pointDuration = Math.ceil(data.time_left / data.discussion_points.length)
    const now = new Date()
    
    const discussionPoints = data.discussion_points.map((point, index) => {
      const scheduledStart = new Date(now.getTime() + (index * pointDuration * 1000))
      
      return {
        content: point,
        index,
        scheduled_start: scheduledStart.toISOString(),
        duration: pointDuration
      }
    })

    const { data: newDiscussion, error } = await supabase
      .from('sessions')
      .insert([{
        status: data.status, 
        title: data.title,
        task: data.task,
        scenario: data.scenario,
        discussion_points: discussionPoints,
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
    const { error } = await supabase
      .rpc('delete_discussion_cascade', {
        discussion_id: id
      })

    if (error) throw error
    
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

export async function updateMessageWithAudioUrl(
  discussionId: string,
  userId: string,
  transcript: string,
  pitchedUrl: string
) {
  const supabase = await createClient();

  try {
    // Just update the message with the audio URL
    // The current_point is already set when the message was created
    const { error: updateError } = await supabase
      .from('messages')
      .update({ 
        audio_url: pitchedUrl
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
    console.log('Error updating message with audio URL:', error);
    return { error };
  }
}

export async function updateHasLaunched(discussionId: string) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('sessions')
      .update({
        has_launched: new Date().toISOString()
      })
      .eq('id', discussionId);

    return { error };
  } catch (error) {
    console.log('Error updating has_launched:', error);
    return { error };
  }
}

export async function updateDiscussionPointTimestamps(discussionId: string) {
  const supabase = await createClient();
  
  try {
    // First get the discussion to access has_launched and points
    const { data: discussion, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', discussionId)
      .single();

    if (fetchError || !discussion?.has_launched) throw fetchError;

    // Calculate new point durations and timestamps
    const pointDuration = Math.ceil(discussion.time_left / discussion.discussion_points.length);
    const launchTime = new Date(discussion.has_launched);
    
    const updatedPoints: DiscussionPoint[] = discussion.discussion_points.map((point: DiscussionPoint, index: number) => {
      const scheduledStart = new Date(launchTime.getTime() + (index * pointDuration * 1000));
      
      return {
        ...point,
        scheduled_start: scheduledStart.toISOString(),
        duration: pointDuration
      };
    });

    // Update the discussion with new point timestamps
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        discussion_points: updatedPoints
      })
      .eq('id', discussionId);

    if (updateError) throw updateError;
    
    return { error: null };
  } catch (error) {
    console.log('Error updating discussion point timestamps:', error);
    return { error };
  }
}

export async function updateAnalysisAnswers(
  sessionId: string,
  groupId: string,
  currentPointKey: string,
  currentAnswers: SharedAnswers,
  currentBullets: BulletPoint[],
  newPoints: string[]
) {
  const supabase = await createClient()
  
  try {
    const updatedAnswers = {
      ...currentAnswers,
      [currentPointKey]: [
        ...currentBullets,
        ...newPoints.map((content: string) => ({ content, isDeleted: false }))
      ]
    };

    const { error } = await supabase
      .from('shared_answers')
      .upsert({
        session_id: sessionId,
        group_id: groupId,
        answers: updatedAnswers,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'session_id,group_id',
        ignoreDuplicates: false
      });

    if (error) throw error
    
    return { data: updatedAnswers, error: null }
  } catch (error) {
    console.log('Error updating analysis answers:', error)
    return { data: null, error }
  }
}