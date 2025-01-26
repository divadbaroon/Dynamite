
import React, { useState, useRef, useEffect, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"  
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { Message, ChatWindowProps } from '@/types'
import AudioInput from '@/components/Discussion/Audio/AudioInput'
import { getUserById } from '@/lib/actions/user'
import { updateUserConsent } from '@/lib/actions/user'
import ConsentModal from '@/components/Discussion/consent/ConsentModal'
import { DeepgramContextProvider } from '@/components/Discussion/Audio/DeepgramContextProvider'
import { useDeepgram } from '@/components/Discussion/Audio/DeepgramContextProvider';

import { SupabaseUser, UserData } from "@/types"

const DeepgramInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setDeepgramKey } = useDeepgram();
  
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
    if (key) {
      setDeepgramKey(key);
    } else {
      console.error('Deepgram API key is not set in environment variables');
    }
  }, [setDeepgramKey]);

  return <>{children}</>;
};

function ChatWindow({ groupId, discussionId }: ChatWindowProps) {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [hasConsented, setHasConsented] = useState<boolean | null>(null)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [isProcessingConsent, setIsProcessingConsent] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error fetching user:', error)
        return
      }
      setUser(currentUser)
    }
  
    getUser()
  
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
  
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth]) 

  useEffect(() => {
    const checkUserConsent = async () => {
      if (!user) return
      
      try {
        const data = await getUserById(user.id)
        if (data) {
          // Type assertion to ensure the data matches our User type
          setUserData(data as UserData)
          setHasConsented(data.consent_status ?? false)
        }
      } catch (error) {
        console.error('Error fetching user consent:', error)
        setHasConsented(false)
      }
    }
  
    checkUserConsent()
  }, [user])

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
        console.error('Error fetching messages:', error)
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
  }, [groupId, user, supabase])

  const handleConsent = async (hasConsented: boolean) => {
    if (!user) return
    
    setIsProcessingConsent(true)
    try {
      await updateUserConsent({
        user_id: user.id,
        consent_status: hasConsented
      })
      setHasConsented(hasConsented)
      setShowConsentModal(false)
    } catch (error) {
      console.error('Error updating consent:', error)
      toast.error("Failed to update consent status")
    } finally {
      setIsProcessingConsent(false)
    }
  }

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
      console.error('Error sending message:', error)
      toast.error("Failed to send message")
    }
  }, [user, hasConsented, userData, discussionId, groupId, supabase]) 

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage(newMessage)
  }

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }

  const shouldGroupMessage = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return false
    return currentMsg.user_id === prevMsg.user_id && 
           new Date(currentMsg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000
  }

  return (
    <Card className="w-full h-[90vh] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-2xl text-center">Group Chat</CardTitle>
        <Separator/>
      </CardHeader>

      {loading ? (
        <div className="flex-grow flex items-center justify-center">  
          <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <CardContent className="flex-grow overflow-hidden p-0" ref={scrollAreaRef}>
            <ScrollArea className="h-full px-4">
              {messages.map((message, index) => {
                const prevMessage = index > 0 ? messages[index - 1] : null
                const isGrouped = shouldGroupMessage(message, prevMessage)
                const isCurrentUser = message.user_id === user?.id
                const showTimestamp = !isGrouped || index === messages.length - 1
                
                return (
                  <div key={message.id} className="mb-4">
                    <div className={`flex items-start gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      {!isCurrentUser && (
                        <div className={`flex-shrink-0 ${isGrouped ? 'invisible' : ''} mt-6`}>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`/placeholder.svg?height=32&width=32`} alt={message.username} />
                            <AvatarFallback className="text-xs">{message.username[0]}</AvatarFallback>
                          </Avatar>
                        </div>  
                      )}
                      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[65%]`}>
                        {!isGrouped && (
                          <span className="text-xs font-medium text-gray-500 mb-1">
                            {message.username}
                          </span>
                        )}
                        <div 
                          className={`inline-block px-4 py-2 
                            ${isCurrentUser  
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                            }
                            ${isGrouped
                              ? 'rounded-2xl'  
                              : isCurrentUser
                                ? 'rounded-t-2xl rounded-l-2xl rounded-br-md'
                                : 'rounded-t-2xl rounded-r-2xl rounded-bl-md'
                            }
                          `}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                        {showTimestamp && (
                          <span className="text-[11px] text-gray-400 mt-1">
                            {new Date(message.created_at).toLocaleTimeString([], {  
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>
                      {isCurrentUser && (
                        <div className={`flex-shrink-0 ${isGrouped ? 'invisible' : ''} mt-6`}>  
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`/placeholder.svg?height=32&width=32`} alt={message.username} />
                            <AvatarFallback className="text-xs">{message.username[0]}</AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </ScrollArea>
          </CardContent>

          <CardFooter className="flex-shrink-0 p-4 bg-gray-50">
            <div className="w-full space-y-4">
              {!hasConsented && (
                <div className="w-full flex flex-col items-center gap-2 mb-4">
                  <p className="text-black-800 text-sm text-center">
                    Please provide your consent to participate in the discussion.  
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowConsentModal(true)}
                    className="w-auto"  
                  >
                    Review Consent Form
                  </Button>
                </div>
              )}
              <form
                onSubmit={handleFormSubmit}
                className="flex w-full items-center space-x-2" 
              >
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className={`flex-1 ${!hasConsented ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!hasConsented}
                />
                {user && discussionId ? (
                <DeepgramContextProvider>
                  <DeepgramInitializer>
                    <AudioInput
                      onMessageSubmit={handleSendMessage}
                      userId={user.id}
                      discussionId={discussionId}
                      disabled={!hasConsented}
                    />
                  </DeepgramInitializer>
                </DeepgramContextProvider>
              ) : null}

                <Button  
                  type="submit"
                  disabled={!hasConsented}
                  className={!hasConsented ? "opacity-50 cursor-not-allowed" : ""}
                >
                  Send
                </Button>
              </form>

              {showConsentModal && (
                <ConsentModal 
                  isOpen={showConsentModal}
                  onClose={() => setShowConsentModal(false)}
                  onConsent={handleConsent}
                  isProcessing={isProcessingConsent}
                />  
              )}
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  )
}

export default ChatWindow