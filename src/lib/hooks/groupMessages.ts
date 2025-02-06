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
        console.log('Error fetching messages:', error)
        toast.error("Failed to load messages") 
      }
    }

    const channel = supabase
      .channel(`group-${groupId}-messages`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages(current => [...current, newMessage])
          scrollToBottom()
        }
      )
      .subscribe()

    fetchMessages()

    return () => {
      channel.unsubscribe()
    }
  }, [groupId, user, scrollAreaRef])

  return { messages, loading, scrollToBottom }
}