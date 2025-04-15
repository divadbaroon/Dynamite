import { useState, useEffect, RefObject } from "react"
import { toast } from "sonner"
import { SupabaseUser, Message } from "@/types"
import { createClient } from "@/utils/supabase/client"

export function useGroupMessages(
  groupId: string, 
  user: SupabaseUser | null,
  scrollAreaRef: RefObject<HTMLDivElement | null>
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const supabase = createClient()

  // Improved scroll function
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaRef?.current) {
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight
        }
      }
    }, 50) // Small delay to ensure DOM updates
  }

  // Handle fetching messages and setting up subscription
  useEffect(() => {
    if (!groupId || !user) return
    let isMounted = true

    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for group:', groupId)
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: true })

        if (error) throw error
        if (isMounted) {
          setMessages((data || []) as Message[])
          setLoading(false)
          scrollToBottom()
        }
      } catch (error) {
        console.error('Error fetching messages:', error)
        toast.error("Failed to load messages") 
      }
    }

    // Use a stable channel name that won't change between component mounts
    const channelName = `messages-${groupId}`
    console.log('Setting up channel:', channelName)

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*',
          schema: 'public', 
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          console.log('Message change received:', payload)
          
          if (payload.eventType === 'INSERT') {
            if (isMounted) {
              setMessages(current => [...current, payload.new as Message])
              scrollToBottom()
            }
          } else if (payload.eventType === 'UPDATE') {
            if (isMounted) {
              setMessages(current => 
                current.map(msg => 
                  msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                )
              )
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        if (isMounted) {
          setIsSubscribed(status === 'SUBSCRIBED')
        }
      })

    fetchMessages()

    return () => {
      console.log('Cleaning up subscription:', channelName)
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [groupId, user]) // Removed scrollAreaRef from dependencies

  // Debug logging for messages updates
  useEffect(() => {
    if (messages.length > 0) {
      console.log(`Messages updated:`, {
        totalMessages: messages.length,
        firstMessageTimestamp: messages[0]?.created_at,
        lastMessageTimestamp: messages[messages.length - 1]?.created_at
      });
    }
  }, [messages]);

  // Separate effect for scrolling when messages update
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      scrollToBottom()
    }
  }, [messages.length, loading])

  return { 
    messages, 
    loading, 
    scrollToBottom,
    isSubscribed 
  }
}