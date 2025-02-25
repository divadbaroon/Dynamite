"use client"

import React, { useEffect, useRef } from 'react'
import ChatWindow from '@/components/Discussion/chat-window/ChatWindow'
import DiscussionGuide from '@/components/Discussion/discussion-guide/DiscussionGuide'
import { useDiscussion } from '@/lib/hooks/useDiscussion'
import { useSharedAnswers } from '@/lib/hooks/sharedAnswers'
import { useGroupMessages } from '@/lib/hooks/groupMessages'
import { useSupabaseUser } from '@/lib/hooks/supabaseUser'
import { useAnalysisRunner } from "@/lib/hooks/useAnalysisRunner"
import { DiscussionClientProps } from '@/types'

export default function DiscussionClient({ discussionId, groupId }: DiscussionClientProps) {

    // Get current user information
    const { user } = useSupabaseUser()

    // Hook that manages discussion progress and timing
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
    
    // Used to maintain scroll position during updates
    const scrollAreaRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>

    // Hook for managing real-time messages
    const { messages, loading: messagesLoading } = useGroupMessages(groupId, user, scrollAreaRef, currentPointIndex)

    // Hook for managing real-time shared answers 
    const { sharedAnswers } = useSharedAnswers(discussionId, groupId)
    
    // Get current discussion point
    const currentPoint = discussion?.discussion_points?.[currentPointIndex] || null;

    // Combined hook for running all analyses
    const { 
        isAnalyzingTranscript,
        transcriptStatus,
        isAnalyzingEthics,
        ethicsStatus
    } = useAnalysisRunner({
        discussionId: discussion?.id || '',
        groupId,
        messages,
        isTimeUp,
        currentPoint: currentPoint!,
        sharedAnswers
    })

    const isLoading = discussionLoading || messagesLoading

    // For logging analysis dependency updates
    useEffect(() => {
        console.log('[DiscussionClient] Analysis dependencies updated:', {
            currentPointIndex,
            currentPoint: currentPoint?.content,
            sharedAnswersKeys: Object.keys(sharedAnswers || {}),
            messageCount: messages.length,
            timestamp: new Date().toISOString()
        })
    }, [currentPoint, sharedAnswers, messages, currentPointIndex])

    // For component lifecycle logging
    useEffect(() => {
        const componentState = {
            discussionId,
            groupId,
            status: isLoading ? 'loading' : error ? 'error' : 'ready',
            timestamp: new Date().toISOString()
        }

        console.log('[DiscussionClient] Mount:', componentState)

        return () => {
            console.log('[DiscussionClient] Unmount:', {
                ...componentState,
                timestamp: new Date().toISOString()
            })
        }
    }, [discussionId, groupId, isLoading, error])

    // Loading state renderer
    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin" />
            </div>
        )
    }

    // Error state renderer
    if (error) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center">
                <div className="text-red-500 text-xl mb-4">{error}</div>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-64px)]">

            {/* Discussion Guide Panel */}
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

                 {/* Analysis Status Indicators */}
                <div className="fixed bottom-4 right-4 space-y-2">
                    {isAnalyzingTranscript && transcriptStatus && (
                        <div className="bg-white p-2 rounded-md shadow-md text-sm text-gray-600">
                            Transcript Analysis: {transcriptStatus}
                        </div>
                    )}
                    {isAnalyzingEthics && ethicsStatus && (
                        <div className="bg-white p-2 rounded-md shadow-md text-sm text-gray-600">
                            Ethical Analysis: {ethicsStatus}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Window Panel */}
            <div className="flex-1 p-4 overflow-hidden">
                <ChatWindow 
                    groupId={groupId} 
                    discussionId={discussionId}
                    messages={messages}
                    isTimeUp={isTimeUp}
                    loading={messagesLoading}
                    scrollAreaRef={scrollAreaRef}
                    user={user} 
                    currentPointIndex={currentPointIndex}
                />
            </div>
        </div>
    )
}