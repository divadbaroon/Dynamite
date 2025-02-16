"use client"

import { useEffect, useRef } from 'react'
import { useTranscriptAnalysis } from "./transcriptAnalaysis"
import { UseTranscriptAnalysisRunnerProps, UseTranscriptAnalysisRunnerReturn } from "@/types"

export function useTranscriptAnalysisRunner({
    discussionId,
    groupId,
    messages,
    isTimeUp,
    currentPoint,
    sharedAnswers
}: UseTranscriptAnalysisRunnerProps): UseTranscriptAnalysisRunnerReturn {
    // Track last analyzed message count
    const lastAnalyzedMessageCount = useRef<number>(0)
    
    // All group messages reference
    const messagesRef = useRef<typeof messages>([])
    
    // Init analysis functionality and status
    const { analyzeTranscript, isAnalyzing, status } = useTranscriptAnalysis()

    // Update messagesRef when messages change
    useEffect(() => {
        const newMessageCount = messages.length
        const lastCount = lastAnalyzedMessageCount.current

        console.log('[useTranscriptAnalysisRunner] Messages updated:', {
            newMessageCount,
            lastAnalyzedCount: lastCount,
            hasNewMessages: newMessageCount > lastCount,
            timestamp: new Date().toISOString()
        })

        messagesRef.current = messages
    }, [messages])

    // Run transcript analysis on interval when discussion is active and there are new messages
    useEffect(() => {
        if (!discussionId || !groupId || isTimeUp) return;

        console.log('[useTranscriptAnalysisRunner] Setting up analysis interval')

        const runAnalysis = async () => {
            const currentCount = messagesRef.current.length
            
            // Add more detailed logging
            console.log('[useTranscriptAnalysisRunner] Checking messages:', {
                currentCount,
                lastAnalyzed: lastAnalyzedMessageCount.current,
                difference: currentCount - lastAnalyzedMessageCount.current,
                hasNewMessages: currentCount > lastAnalyzedMessageCount.current,
                timestamp: new Date().toISOString()
            })

            // Only run if we have new messages
            if (currentCount > lastAnalyzedMessageCount.current) {
                console.log('[useTranscriptAnalysisRunner] Running analysis for new messages')
                
                try {
                    const result = await analyzeTranscript(
                        discussionId,
                        groupId,
                        messagesRef.current,
                        currentPoint,
                        sharedAnswers
                    )
                    
                    if (result.success) {
                        lastAnalyzedMessageCount.current = currentCount
                    }
                    
                } catch (error) {
                    console.error('[useTranscriptAnalysisRunner] Analysis failed:', error)
                }
            }
        }

        // Run initial analysis
        runAnalysis()
        
        // Set up interval
        const interval = setInterval(runAnalysis, 15000)
        return () => clearInterval(interval)
        
    }, [discussionId, groupId, analyzeTranscript, isTimeUp, currentPoint, sharedAnswers])

    return {
        isAnalyzing,
        status
    }
}