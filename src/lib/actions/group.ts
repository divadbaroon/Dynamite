'use server'

import { createClient } from '@/utils/supabase/server'
import { GroupJoinResponse, Group } from '@/types'

export async function joinOrCreateGroup(sessionId: string, groupNumber: number): Promise<GroupJoinResponse> {
  const supabase = await createClient()
  
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Not authenticated')
    }

    // First, check if the group exists
    let { data: existingGroup, error: fetchError } = await supabase
      .from('groups')
      .select('*')
      .eq('session_id', sessionId)
      .eq('number', groupNumber)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw fetchError
    }

    if (existingGroup) {
      // Check if user is already in the group
      if (existingGroup.users_list.includes(user.id)) {
        return { group: existingGroup, error: null }
      }

      // Group exists, add user to it
      const { data: updatedGroup, error: updateError } = await supabase
        .from('groups')
        .update({
          users_list: [...(existingGroup.users_list || []), user.id]
        })
        .eq('id', existingGroup.id)
        .select()
        .single()

      if (updateError) throw updateError
      return { group: updatedGroup, error: null }
    }

    // Group doesn't exist, create it
    const { data: newGroup, error: createError } = await supabase
      .from('groups')
      .insert([{
        session_id: sessionId,
        number: groupNumber,
        users_list: [user.id]
      }])
      .select()
      .single()

    if (createError) throw createError
    return { group: newGroup, error: null }
  } catch (error) {
    console.error('Error in joinOrCreateGroup:', error)
    return { group: null, error: error as Error }
  }
}

export async function leaveGroup(groupId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Not authenticated')
    }

    // Get current group data
    const { data: group, error: fetchError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (fetchError) throw fetchError

    // Check if user is in group
    if (!group.users_list.includes(user.id)) {
      throw new Error("User is not in this group")
    }

    // Update group
    const { error: updateError } = await supabase
      .from('groups')
      .update({
        users_list: group.users_list.filter((id: string) => id !== user.id)
      })
      .eq('id', groupId)

    if (updateError) throw updateError
    return { error: null }
  } catch (error) {
    console.error('Error leaving group:', error)
    return { error }
  }
}

export async function getGroupById(groupId: string) {
  const supabase = await createClient()
  
  try {
    const { data: groups, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)

    if (error) throw error

    const group = groups?.[0]
    if (!group) throw new Error('Group not found')

    return { group, error: null }
  } catch (error) {
    console.error('Error fetching group:', error)
    return { group: null, error }
  }
}    
