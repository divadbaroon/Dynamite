"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from "@/utils/supabase/client"
import { getDiscussionById } from '@/lib/actions/discussion'
import { Discussion, UseDiscussionReturn } from '@/types'

export function useDiscussion(discussionId: string): UseDiscussionReturn {
    const [discussion, setDiscussion] = useState<Discussion | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isRunning, setIsRunning] = useState(false)
    const [currentPointIndex, setCurrentPointIndex] = useState(0)
    const [isTimeUp, setIsTimeUp] = useState<boolean>(false)
    
    // Derive openItem from currentPointIndex
    const openItem = useMemo(() => `item-${currentPointIndex}`, [currentPointIndex])

    // Optimize handler with useCallback
    const handleSetCurrentPoint = useCallback((index: number) => {
        console.log('[useDiscussion] Setting current point:', {
            previousIndex: currentPointIndex,
            newIndex: index
        })
        setCurrentPointIndex(index)
    }, [currentPointIndex])

    // Initial data fetch
    useEffect(() => {
        const fetchDiscussion = async () => {
            console.log('[useDiscussion] Fetching discussion with ID:', discussionId)
            try {
                if (!discussionId) {
                    console.error('[useDiscussion] No discussion ID provided')
                    setError("No discussion ID provided")
                    return
                }

                const response = await getDiscussionById(discussionId)
                
                if (response.error) {
                    console.error('[useDiscussion] API error:', response.error)
                    throw response.error
                }

                if (!response.discussion) {
                    console.error('[useDiscussion] Discussion not found')
                    setError("Discussion not found")
                    return
                }

                console.log('[useDiscussion] Successfully fetched discussion:', {
                    id: response.discussion.id,
                    status: response.discussion.status
                })

                setDiscussion(response.discussion)
                setIsRunning(response.discussion.status === 'active')
                
                if (response.discussion.currentPointIndex !== undefined) {
                    setCurrentPointIndex(response.discussion.currentPointIndex)
                }
                
                if (response.discussion.isTimeUp !== undefined) {
                    setIsTimeUp(response.discussion.isTimeUp)
                }

            } catch (error) {
                console.error('[useDiscussion] Error fetching discussion:', error)
                setError("Failed to load discussion data")
            } finally {
                setLoading(false)
            }
        }

        fetchDiscussion()
    }, [discussionId])

    // Real-time subscription
    useEffect(() => {
        if (!discussionId) return;

        console.log('[useDiscussion] Setting up real-time subscription for:', discussionId)
        
        const supabase = createClient();
        const channel = supabase
            .channel(`session-${discussionId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'sessions',
                    filter: `id=eq.${discussionId}`
                },
                (payload) => {
                    console.log('[useDiscussion] Received real-time update:', payload)
                    const updatedDiscussion = payload.new as Discussion;
                    
                    setDiscussion(updatedDiscussion)
                    setIsRunning(updatedDiscussion.status === 'active');
                    
                    if (updatedDiscussion.current_point !== undefined && 
                        updatedDiscussion.current_point !== currentPointIndex) {
                        console.log('[useDiscussion] Updating current point:', {
                            old: currentPointIndex,
                            new: updatedDiscussion.current_point
                        })
                        setCurrentPointIndex(updatedDiscussion.current_point);
                    }
                }
            )
            .subscribe()

        return () => {
            console.log('[useDiscussion] Cleaning up subscription for:', discussionId)
            channel.unsubscribe()
        }
    }, [discussionId, currentPointIndex])

    // Log state changes
    useEffect(() => {
        console.log('[useDiscussion] State updated:', {
            currentPointIndex,
            isTimeUp,
            openItem,
            isRunning,
            timestamp: new Date().toISOString()
        })
    }, [currentPointIndex, isTimeUp, openItem, isRunning])

    return {
        discussion,
        loading,
        error,
        isRunning,
        isTimeUp,
        currentPointIndex,
        openItem,
        setIsRunning,
        setIsTimeUp,
        handleSetCurrentPoint, 
    }
}