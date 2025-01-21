"use client"

import React, { useState, useEffect } from 'react'
import ChatWindow from '@/components/Discussion/session/ChatWindow'
import DiscussionGuide from '@/components/Discussion/session/DiscussionGuide'
import { getSessionById } from '@/lib/actions/session'
import { analyzeTranscript } from '@/lib/actions/transcript'
import { Session, DiscussionClientProps } from '@/types'

function DiscussionClient({ sessionId, groupId }: DiscussionClientProps) {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchSession = async () => {
            try {
                if (!sessionId) {
                    setError("No session ID provided")
                    return
                }

                const response = await getSessionById(sessionId)
                
                if (response.error) {
                    throw response.error
                }

                if (!response.session) {
                    setError("Session not found")
                    return
                }

                setSession(response.session)
            } catch (error) {
                console.error("Error fetching session:", error)
                setError("Failed to load session data")
            } finally {
                setLoading(false)
            }
        }

        fetchSession()
    }, [sessionId])

    // Transcript analysis interval using server action
    useEffect(() => {
        if (!session?.id || !groupId) return

        const runAnalysis = async () => {
            try {
                const result = await analyzeTranscript(groupId, session.id)
                console.log('Transcript analysis result:', result)
                if (!result.success) {
                    console.log('Transcript analysis failed:', result.error)
                }
            } catch (error) {
                console.log('Error running transcript analysis:', error)
            }
        }

        // Run initial analysis
        runAnalysis()

        // Set up interval (every 10 seconds)
        const intervalId = setInterval(runAnalysis, 1 * 10 * 1000)

        return () => clearInterval(intervalId)
    }, [session?.id, groupId])

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
                    session={session} 
                    mode="discussion" 
                    groupId={groupId}
                />
            </div>
            <div className="flex-1 p-4 overflow-hidden">
                <ChatWindow 
                    groupId={groupId} 
                    sessionId={sessionId}
                />
            </div>
        </div>
    )
}

export default DiscussionClient