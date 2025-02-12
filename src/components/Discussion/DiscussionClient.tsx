"use client"

import React, { useState, useEffect, useRef } from 'react'

import ChatWindow from '@/components/Discussion/chat-window/ChatWindow'
import DiscussionGuide from '@/components/Discussion/discussion-guide/DiscussionGuide'

import { getDiscussionById } from '@/lib/actions/discussion'

import { useSharedAnswers } from '@/lib/hooks/sharedAnswers'
import { useSessionSubscription } from '@/lib/hooks/sessionSubscription'
import { useTranscriptAnalysis } from "@/lib/hooks/transcriptAnalaysis"
import { useGroupMessages } from '@/lib/hooks/groupMessages'
import { useSupabaseUser } from '@/lib/hooks/supabaseUser'

import { Discussion, DiscussionClientProps } from '@/types'

export default function DiscussionClient({ discussionId, groupId }: DiscussionClientProps) {
    const [discussion, setDiscussion] = useState<Discussion | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPointIndex, setCurrentPointIndex] = useState(0)
    const [isRunning, setIsRunning] = useState(false)
    const [openItem, setOpenItem] = useState<string>(`item-${currentPointIndex}`)
    const [isTimeUp, setIsTimeUp] = useState<boolean>(false)
    
    const scrollAreaRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>
    const { user } = useSupabaseUser()
    const messagesRef = useRef<typeof messages>([])
    
    // Get messages
    const { messages, loading: messagesLoading } = useGroupMessages(groupId, user, scrollAreaRef)
    
    // Update messagesRef when messages change
    useEffect(() => {
        messagesRef.current = messages
    }, [messages])
    
    // Get analysis functionality and status
    const { analyzeTranscript, isAnalyzing, status } = useTranscriptAnalysis()
    
    // Get shared answers
    const { sharedAnswers } = useSharedAnswers(discussionId, groupId)

    // Fetch discussion data
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
                console.error("Error fetching discussion:", error)
                setError("Failed to load discussion data")
            } finally {
                setLoading(false)
            }
        }

        fetchDiscussion()
    }, [discussionId])

    // Subscribe to session updates
    useSessionSubscription({
        sessionId: discussionId,
        currentPointIndex,
        setIsRunning,
        setCurrentPointIndex,
        setOpenItem
    })

    // Run transcript analysis on interval when discussion is active
    useEffect(() => {
        let analysisInterval: NodeJS.Timeout | null = null
        
        if (discussion?.id && groupId && !isTimeUp) {
            const runAnalysis = async () => {
                try {
                    // Use the ref to get latest messages
                    const result = await analyzeTranscript(discussion.id, groupId, messagesRef.current)
                    
                    if (result.inProgress) {
                        console.log('Analysis in progress:', result.message)
                    }
                } catch (error) {
                    console.error('Analysis failed:', error)
                }
            }
            
            // Initial analysis
            runAnalysis()
            
            // Set up interval (every 15 seconds)
            analysisInterval = setInterval(runAnalysis, 15000)
        }

        return () => {
            if (analysisInterval) {
                clearInterval(analysisInterval)
            }
        }
    }, [discussion?.id, groupId, analyzeTranscript, isTimeUp]) // Removed messages and discussion.status from deps

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
                    isTimeUp={isTimeUp}
                    setCurrentPointIndex={setCurrentPointIndex}
                    setIsRunning={setIsRunning}
                    setOpenItem={handleSetOpenItem}
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
                    isTimeUp={isTimeUp}
                    messages={messages}
                    loading={messagesLoading}
                    scrollAreaRef={scrollAreaRef}
                />
            </div>
        </div>
    )
}