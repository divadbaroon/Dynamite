"use client"

import React, { useEffect, useRef } from 'react'
import ChatWindow from '@/components/Discussion/chat-window/ChatWindow'
import DiscussionGuide from '@/components/Discussion/discussion-guide/DiscussionGuide'
import { useDiscussion } from '@/lib/hooks/useDiscussion'
import { useSharedAnswers } from '@/lib/hooks/sharedAnswers'
import { useGroupMessages } from '@/lib/hooks/groupMessages'
import { useSupabaseUser } from '@/lib/hooks/supabaseUser'
import { useTranscriptAnalysisRunner } from "@/lib/hooks/useTranscriptAnalysisRunner"
import { DiscussionClientProps } from '@/types'

export default function DiscussionClient({ discussionId, groupId }: DiscussionClientProps) {
    const { user } = useSupabaseUser()

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
    
    // Get current discussion point with type safety
    const currentPoint = discussion?.discussion_points?.[currentPointIndex] || null;

    // Call the hook at the top level with conditional rendering later
    const { isAnalyzing, status } = useTranscriptAnalysisRunner({
        discussionId: discussion?.id || '',
        groupId,
        messages,
        isTimeUp,
        currentPoint: currentPoint!, // Type assertion since we'll check before using
        sharedAnswers
    })

    const isLoading = discussionLoading || messagesLoading

    useEffect(() => {
        console.log('[DiscussionClient] Analysis dependencies updated:', {
            currentPointIndex,
            currentPoint: currentPoint?.content,
            sharedAnswersKeys: Object.keys(sharedAnswers || {}),
            messageCount: messages.length,
            timestamp: new Date().toISOString()
        })
    }, [currentPoint, sharedAnswers, messages, currentPointIndex])

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
                    groupId={groupId} 
                    discussionId={discussionId}
                    messages={messages}
                    isTimeUp={isTimeUp}
                    loading={messagesLoading}
                    scrollAreaRef={scrollAreaRef}
                />
            </div>
        </div>
    )
}