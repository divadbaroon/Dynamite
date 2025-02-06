import React, { useState, useRef, useEffect } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"  
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import ConsentModal from '@/components/Discussion/consent/ConsentModal'

import AudioInput from '@/components/Discussion/audio/AudioInput'
import { DeepgramContextProvider } from '@/components/Discussion/audio/DeepgramContextProvider'
import { useDeepgram } from '@/components/Discussion/audio/DeepgramContextProvider'

import { useSupabaseUser } from '@/lib/hooks/supabaseUser'
import { useUserConsent } from '@/lib/hooks/userConsent'
import { useGroupMessages } from '@/lib/hooks/groupMessages'
import { useChatActions } from '@/lib/hooks/chatActions'

import { ChatWindowProps } from '@/types'

const DeepgramInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
}

function ChatWindow({ groupId, discussionId, isTimeUp  }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("")
  const [showConsentModal, setShowConsentModal] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const { user } = useSupabaseUser()
  const { 
    userData, 
    hasConsented, 
    isProcessingConsent, 
    handleConsent 
  } = useUserConsent(user)
  
  const { messages, loading } = useGroupMessages(groupId, user, scrollAreaRef)

  const { 
    handleSendMessage, 
    shouldGroupMessage 
  } = useChatActions({
    user,
    userData,
    hasConsented,
    discussionId,
    groupId,
    setNewMessage
  })

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage(newMessage)
  }

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
                {user && discussionId && (
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
                )}

                <Button  
                  type="submit"
                  disabled={!hasConsented}
                  className={!hasConsented ? "opacity-50 cursor-not-allowed" : ""}
                >
                  Send
                </Button>
              </form>

              <ConsentModal 
                isOpen={showConsentModal}
                onClose={() => setShowConsentModal(false)}
                onConsent={handleConsent}
                isProcessing={isProcessingConsent}
              />
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  )
}

export default ChatWindow