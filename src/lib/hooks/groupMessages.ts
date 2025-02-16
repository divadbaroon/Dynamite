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

  return { 
    messages, 
    loading, 
    scrollToBottom,
    isSubscribed 
  }
}