import { useState, useEffect, RefObject, useMemo } from "react"
import { toast } from "sonner"
import { SupabaseUser, Message } from "@/types"
import { createClient } from "@/utils/supabase/client"

export function useGroupMessages(
  groupId: string, 
  user: SupabaseUser | null,
  scrollAreaRef: RefObject<HTMLDivElement | null>,
  currentPointIndex?: number  
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const supabase = createClient()

  const scrollToBottom = () => {
    if (scrollAreaRef?.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }

  useEffect(() => {
    if (!groupId || !user) return

    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for group:', groupId)
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: true })

        if (error) throw error
        setMessages((data || []) as Message[])
        setLoading(false)
        scrollToBottom()
      } catch (error) {
        console.error('Error fetching messages:', error)
        toast.error("Failed to load messages") 
      }
    }

    const channelName = `messages-${groupId}-${Date.now()}`
    console.log('Setting up channel:', channelName)

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', // Listen to all events
          schema: 'public', 
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          console.log('Message change received:', payload)
          
          if (payload.eventType === 'INSERT') {
            setMessages(current => [...current, payload.new as Message])
          } else if (payload.eventType === 'UPDATE') {
            setMessages(current => 
              current.map(msg => 
                msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
              )
            )
          }
          scrollToBottom()
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        setIsSubscribed(status === 'SUBSCRIBED')
      })

    fetchMessages()

    return () => {
      console.log('Cleaning up subscription:', channelName)
      supabase.removeChannel(channel)
    }
  }, [groupId, user, scrollAreaRef])

  // Filter messages by current point index if provided
  const filteredMessages = useMemo(() => {
    if (currentPointIndex === undefined) {
      return messages; // Return all messages if no current point index
    }
    
    return messages.filter(message => {
      // Include messages that match current point or don't have a point set
      // This preserves backward compatibility with existing messages
      return message.current_point === currentPointIndex || message.current_point === undefined || message.current_point === null;
    });
  }, [messages, currentPointIndex]);

  // For debugging
  useEffect(() => {
    if (currentPointIndex !== undefined) {
      console.log(`Filtered messages for point ${currentPointIndex}:`, {
        totalMessages: messages.length,
        filteredMessages: filteredMessages.length,
        firstMessageTimestamp: filteredMessages[0]?.created_at,
        lastMessageTimestamp: filteredMessages[filteredMessages.length - 1]?.created_at
      });
    }
  }, [filteredMessages, messages, currentPointIndex]);

  return { 
    messages: filteredMessages, 
    loading, 
    scrollToBottom,
    isSubscribed 
  }
}