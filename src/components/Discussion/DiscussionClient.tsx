"use client"

import React, { useState, useEffect } from 'react'
import ChatWindow from '@/components/Discussion/ChatWindow/ChatWindow'
import DiscussionGuide from '@/components/Discussion/DiscussionGuide/DiscussionGuide'
import { getDiscussionById } from '@/lib/actions/discussion'
import { analyzeTranscript } from '@/lib/actions/transcript'
import { Discussion, DiscussionClientProps } from '@/types'

function DiscussionClient({ discussionId, groupId }: DiscussionClientProps) {
    const [discussion, setDiscussion] = useState<Discussion | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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
            } catch (error) {
                console.log("Error fetching discussion:", error)
                setError("Failed to load discussion data")
            } finally {
                setLoading(false)
            }
        }

        fetchDiscussion()
    }, [discussionId])

    // Transcript analysis interval using server action
    useEffect(() => {
        if (!discussion?.id || !groupId) return

        const runAnalysis = async () => {
            try {
                const result = await analyzeTranscript(groupId, discussion.id)
                console.log('Transcript analysis result:', result)
                if (!result.success) {
                    console.log('Transcript analysis failed:', result.error)
                }
            } catch (error) {
                console.log('Error running transcript analysis:', error)
            }
        }

        // Set up interval (every 10 seconds)
        const intervalId = setInterval(runAnalysis, 1 * 10 * 500)

        return () => clearInterval(intervalId)
    }, [discussion?.id, groupId])

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

export default DiscussionClient