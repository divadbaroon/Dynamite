import { useCallback } from 'react'
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
  setNewMessage
}: UseChatActionsProps) {
  const supabase = createClient()

  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!user || !messageContent.trim() || !hasConsented || !userData) return
  
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          session_id: discussionId,
          group_id: groupId,
          user_id: user.id,
          username: userData.username,
          content: messageContent.trim(),
          audio_url: null
        })
  
      if (error) throw error
  
      setNewMessage("")
    } catch (error) {
      console.log('Error sending message:', error)
      toast.error("Failed to send message")
    }
  }, [user, hasConsented, userData, discussionId, groupId, supabase, setNewMessage])

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