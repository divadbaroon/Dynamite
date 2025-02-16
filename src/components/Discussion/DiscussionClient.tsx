"use client"

import React, { useRef } from 'react'
import ChatWindow from '@/components/Discussion/chat-window/ChatWindow'
import DiscussionGuide from '@/components/Discussion/discussion-guide/DiscussionGuide'
import { useDiscussion } from '@/lib/hooks/useDiscussion'
import { useSharedAnswers } from '@/lib/hooks/sharedAnswers'
import { useGroupMessages } from '@/lib/hooks/groupMessages'
import { useSupabaseUser } from '@/lib/hooks/supabaseUser'
import { useTranscriptAnalysisRunner } from "@/lib/hooks/useTranscriptAnalysisRunner"
import { DiscussionClientProps } from '@/types'
import { useUserConsent } from '@/lib/hooks/userConsent'
import { Button } from "@/components/ui/button"

export default function DiscussionClient({ discussionId, groupId }: DiscussionClientProps) {
    const { user } = useSupabaseUser()
    const { 
        userData, 
        hasConsented, 
        isProcessingConsent, 
        handleConsent 
    } = useUserConsent(user)

    const {
        discussion,
        loading: discussionLoading,
        error,
        isRunning,
        isTimeUp,
        currentPointIndex,
        openItem,
        setIsTimeUp,
        handleSetCurrentPoint  
    } = useDiscussion(discussionId)
    
    const scrollAreaRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>
    const { messages, loading: messagesLoading } = useGroupMessages(groupId, user, scrollAreaRef)
    const { sharedAnswers } = useSharedAnswers(discussionId, groupId)
    
    const currentPoint = discussion?.discussion_points?.[currentPointIndex] || null;

    const { isAnalyzing, status } = useTranscriptAnalysisRunner({
        discussionId: discussion?.id || '',
        groupId,
        messages,
        isTimeUp,
        currentPoint: currentPoint!, 
        sharedAnswers
    })

    const isLoading = discussionLoading || messagesLoading

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center">
                <div className="text-red-500 text-xl mb-4">{error}</div>
            </div>
        )
    }

    if (!currentPoint) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <div className="text-red-500 text-xl">Invalid discussion point</div>
            </div>
        )
    }

    // Show consent modal if not consented
    if (!hasConsented) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                    <h2 className="text-2xl font-semibold mb-4 text-center">Consent Required</h2>
                    <p className="text-gray-600 mb-6 text-center">
                        Please provide your consent to participate in the discussion.
                    </p>
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            onClick={() => handleConsent(true)}
                            disabled={isProcessingConsent}
                            className="w-full max-w-xs"
                        >
                            {isProcessingConsent ? (
                                <div className="w-5 h-5 border-t-2 border-blue-500 rounded-full animate-spin mr-2" />
                            ) : null}
                            Review Consent Form
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-64px)]">
            <div className="flex-1 p-4 overflow-hidden">
                <DiscussionGuide 
                    mode="discussion" 
                    discussion={discussion} 
                    groupId={groupId}
                    sharedAnswers={sharedAnswers}
                    currentPointIndex={currentPointIndex}
                    isRunning={isRunning}
                    isTimeUp={isTimeUp}
                    openItem={openItem}
                    setCurrentPointIndex={handleSetCurrentPoint}
                    setIsTimeUp={setIsTimeUp}
                />
                {isAnalyzing && status && (
                    <div className="fixed bottom-4 right-4 bg-white p-2 rounded-md shadow-md text-sm text-gray-600">
                        Analysis Status: {status}
                    </div>
                )}
            </div>
            <div className="flex-1 p-4 overflow-hidden">
                <ChatWindow 
                    key={`${groupId}-${messages.length}`}
                    groupId={groupId} 
                    discussionId={discussionId}
                    messages={messages}
                    isTimeUp={isTimeUp}
                    loading={messagesLoading}
                    scrollAreaRef={scrollAreaRef}
                    user={user}
                    hasConsented={hasConsented}
                    userData={userData}
                />
            </div>
        </div>
    )
}