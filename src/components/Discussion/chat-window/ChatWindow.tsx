import React, { useState, useEffect, useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"  
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import AudioInput from '@/components/Discussion/audio/AudioInput'
import { DeepgramContextProvider, useDeepgram } from '@/components/Discussion/audio/DeepgramContextProvider'
import { useChatActions } from '@/lib/hooks/chatActions'
import { ChatWindowProps } from '@/types'

const DeepgramInitializer = React.memo(({ children }: { children: React.ReactNode }) => {
  const { setDeepgramKey } = useDeepgram()
  
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY
    if (key) {
      setDeepgramKey(key)
    } else {
      console.log('Deepgram API key is not set in environment variables')
    }
  }, [setDeepgramKey])

  return <>{children}</>
})

DeepgramInitializer.displayName = 'DeepgramInitializer'

function ChatWindow({ 
  groupId, 
  discussionId, 
  isTimeUp,
  messages,
  loading,
  scrollAreaRef,
  user,
  hasConsented,
  userData
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("")
  
  const { handleSendMessage, shouldGroupMessage } = useChatActions({
    user,
    userData,
    hasConsented,
    discussionId,
    groupId,
    setNewMessage
  })

  // Auto-scroll effect
  useEffect(() => {
    if (!loading && messages.length > 0) {
      requestAnimationFrame(() => {
        if (scrollAreaRef?.current) {
          const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
          if (scrollElement) {
            scrollElement.scrollTop = scrollElement.scrollHeight
          }
        }
      })
    }
  }, [messages, loading, scrollAreaRef])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim()) {
      try {
        await handleSendMessage(newMessage)
      } catch (error) {
        console.error('[ChatWindow] Error sending message:', error)
      }
    }
  }

  const audioInputComponent = useMemo(() => {
    if (user && discussionId) {
      return (
        <DeepgramContextProvider>
          <DeepgramInitializer>
            <AudioInput
              onMessageSubmit={handleSendMessage}
              userId={user.id}
              discussionId={discussionId}
              disabled={!hasConsented}
              isTimeUp={isTimeUp} 
            />
          </DeepgramInitializer>
        </DeepgramContextProvider>
      )
    }
    return null
  }, [user, discussionId, handleSendMessage, hasConsented, isTimeUp])

  if (!user) return null

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
                  <div key={`${message.id}-${index}`} className="mb-4">
                    <div className={`flex items-start gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      {!isCurrentUser && (
                        <div className={`flex-shrink-0 ${isGrouped ? 'invisible' : ''} mt-6`}>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.username}/>
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
                            <AvatarImage src={message.username} />
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
            <div className="w-full">
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
                {audioInputComponent}
                <Button  
                  type="submit"
                  disabled={!hasConsented || !newMessage.trim()}
                  className={!hasConsented ? "opacity-50 cursor-not-allowed" : ""}
                >
                  Send
                </Button>
              </form>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  )
}

export default React.memo(ChatWindow)