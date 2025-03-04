import { useCallback, useRef, useEffect } from 'react'
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { Message } from "@/types"

import { UseChatActionsProps } from "@/types"

export function useChatActions({
  user,
  userData,
  hasConsented,
  discussionId,
  groupId,
  currentPointIndex,  
  setNewMessage
}: UseChatActionsProps) {
  const supabase = createClient()
  
  // Use a ref to always have access to the latest currentPointIndex
  const currentPointIndexRef = useRef(currentPointIndex)
  
  // Update the ref whenever currentPointIndex changes
  useEffect(() => {
    currentPointIndexRef.current = currentPointIndex
    console.log('[useChatActions] currentPointIndex updated:', currentPointIndex)
  }, [currentPointIndex])

  const handleSendMessage = useCallback(async (messageContent: string) => {
    // Use the ref's current value for the latest currentPointIndex
    const pointIndex = currentPointIndexRef.current
    
    console.log('[handleSendMessage] Sending message with currentPointIndex:', pointIndex)
    
    if (!user || !messageContent.trim() || !hasConsented || !userData) return
  
    try {
      // Insert the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          session_id: discussionId,
          group_id: groupId,
          user_id: user.id,
          username: userData.username,
          content: messageContent.trim(),
          audio_url: null,
          current_point: pointIndex  
        })
  
      if (messageError) throw messageError
      
      // Update the user's last active timestamp
      const { error: activityError } = await supabase
        .from('users')  
        .update({ 
          last_active: new Date().toISOString() 
        })
        .eq('id', user.id)
        
      if (activityError) {
        console.log('Error updating user activity:', activityError)
      }
  
      setNewMessage("")
    } catch (error) {
      console.log('Error sending message:', error)
      toast.error("Failed to send message")
    }
  }, [user, hasConsented, userData, discussionId, groupId, supabase, setNewMessage]) // removed currentPointIndex from dependencies

  const shouldGroupMessage = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return false
    return currentMsg.user_id === prevMsg.user_id && 
           new Date(currentMsg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000
  }

  return {
    handleSendMessage,
    shouldGroupMessage
  }
}