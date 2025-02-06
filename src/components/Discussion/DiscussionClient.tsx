"use client"

import React, { useState, useEffect } from 'react'
import ChatWindow from '@/components/Discussion/chat-window/ChatWindow'
import DiscussionGuide from '@/components/Discussion/discussion-guide/DiscussionGuide'
import { getDiscussionById } from '@/lib/actions/discussion'
import { Discussion, DiscussionClientProps  } from '@/types'
import { useSharedAnswers } from '@/lib/hooks/sharedAnswers'
import { useSessionSubscription } from '@/lib/hooks/sessionSubscription'
import { useTranscriptAnalysis } from "@/lib/hooks/transcriptAnalaysis"

export default function DiscussionClient({ discussionId, groupId }: DiscussionClientProps) {
    const [discussion, setDiscussion] = useState<Discussion | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPointIndex, setCurrentPointIndex] = useState(0)
    const [isRunning, setIsRunning] = useState(false)
    const [openItem, setOpenItem] = useState<string>(`item-${currentPointIndex}`)
    
    // Properly destructure the hook's return values
    const { sharedAnswers } = useSharedAnswers(discussionId, groupId)

    // Original discussion fetching
    useEffect(() => {
        const fetchDiscussion = async () => {
            try {
                if (!discussionId) {
                    setError("No discussion ID provided")
                    return
                }

                const response = await getDiscussionById(discussionId)
                
                if (response.error) {
                    throw response.error
                }

                if (!response.discussion) {
                    setError("Discussion not found")
                    return
                }

                setDiscussion(response.discussion)
                setIsRunning(response.discussion.status === 'active')
            } catch (error) {
                console.log("Error fetching discussion:", error)
                setError("Failed to load discussion data")
            } finally {
                setLoading(false)
            }
        }

        fetchDiscussion()
    }, [discussionId])

    // webhook for session
    useSessionSubscription({
        sessionId: discussionId,
        currentPointIndex,
        setIsRunning,
        setCurrentPointIndex,
        setOpenItem
    })

    // Transcript analysis interval (every 10 seconds)
    useTranscriptAnalysis(discussion?.id, groupId)

    // Handler for setOpenItem that matches DiscussionGuideProps signature
    const handleSetOpenItem = (item: string | undefined) => {
        if (item !== undefined) {
            setOpenItem(item)
        }
    }

    if (loading) {
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

    return (
        <div className="flex h-screen">
            <div className="flex-1 p-4 overflow-hidden">
                <DiscussionGuide 
                    discussion={discussion} 
                    mode="discussion" 
                    groupId={groupId}
                    sharedAnswers={sharedAnswers}
                    currentPointIndex={currentPointIndex}
                    isRunning={isRunning}
                    openItem={openItem}
                    loading={loading}
                    setCurrentPointIndex={setCurrentPointIndex}
                    setIsRunning={setIsRunning}
                    setOpenItem={handleSetOpenItem}
                />
            </div>
            <div className="flex-1 p-4 overflow-hidden">
                <ChatWindow 
                    groupId={groupId} 
                    discussionId={discussionId}
                />
            </div>
        </div>
    )
}