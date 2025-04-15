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
  
  // Track if a message send is in progress
  const isSendingRef = useRef(false)
  
  // Track the last message content and timestamp
  const lastMessageRef = useRef<{content: string, timestamp: number}>({
    content: '',
    timestamp: 0
  })
  
  // Update the ref whenever currentPointIndex changes
  useEffect(() => {
    currentPointIndexRef.current = currentPointIndex
    console.log('[useChatActions] currentPointIndex updated:', currentPointIndex)
  }, [currentPointIndex])

  const handleSendMessage = useCallback(async (messageContent: string) => {
    // Use the ref's current value for the latest currentPointIndex
    const pointIndex = currentPointIndexRef.current
    const trimmedContent = messageContent.trim()
    
    // Early validation checks
    if (!user || !trimmedContent || !hasConsented || !userData) return
    
    // Prevent duplicate sends: Check if we're already in the process of sending
    if (isSendingRef.current) {
      console.log('[handleSendMessage] Already sending a message, preventing duplicate')
      return
    }
    
    // Prevent duplicate sends: Check if this exact message was sent within the last 2 seconds
    const now = Date.now()
    if (
      trimmedContent === lastMessageRef.current.content && 
      now - lastMessageRef.current.timestamp < 2000
    ) {
      console.log('[handleSendMessage] Same message sent within 2 seconds, preventing duplicate')
      return
    }
    
    // Set sending flag and update last message info before sending
    isSendingRef.current = true
    lastMessageRef.current = {
      content: trimmedContent,
      timestamp: now
    }
    
    console.log('[handleSendMessage] Sending message with currentPointIndex:', pointIndex)
  
    try {
      // Insert the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          session_id: discussionId,
          group_id: groupId,
          user_id: user.id,
          username: userData.username,
          content: trimmedContent,
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
    } finally {
      // Clear sending flag after a short delay
      setTimeout(() => {
        isSendingRef.current = false
      }, 500)
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