"use client"

import { useEffect, useRef, useMemo } from 'react'
import { useTranscriptAnalysis } from "./transcriptAnalaysis"
import { useEthicalAnalysis } from "./useEthicalAnalysis"
import { AnalysisRunnerProps, AnalysisRunnerReturn } from "@/types"

export function useAnalysisRunner({
    discussionId,
    groupId,
    messages,
    isTimeUp,
    currentPoint,
    sharedAnswers
}: AnalysisRunnerProps): AnalysisRunnerReturn {
    // Track last analyzed message counts for each type of analysis
    const lastTranscriptAnalyzedCount = useRef<number>(0)
    const lastEthicalAnalyzedCount = useRef<number>(0)
    
    // Filter messages by current point index
    const filteredMessages = useMemo(() => {
        if (!currentPoint) {
            return messages; // Return all messages if no current point
        }
        
        return messages.filter(message => {
            // Include messages that match current point or don't have a point set
            return message.current_point === currentPoint.index || 
                   message.current_point === undefined || 
                   message.current_point === null;
        });
    }, [messages, currentPoint]);

    console.log("FILTERED MESSAGES: ", filteredMessages)
    
    // All filtered group messages reference
    const messagesRef = useRef<typeof filteredMessages>([])
    
    // Track the current point to detect changes
    const currentPointRef = useRef<number | null>(null)
    
    // Init analysis functionality and status
    const { 
        analyzeTranscript, 
        isAnalyzing: isAnalyzingTranscript, 
        status: transcriptStatus 
    } = useTranscriptAnalysis()

    const { 
        analyzeEthics, 
        isAnalyzing: isAnalyzingEthics, 
        status: ethicsStatus, 
        analysisResult: ethicalAnalysisResult 
    } = useEthicalAnalysis()

    // Reset counters when current point changes
    useEffect(() => {
        // If currentPoint is different than our saved ref, we've moved to a new discussion point
        if (currentPoint && currentPoint.index !== currentPointRef.current) {
            console.log('[useAnalysisRunner] Current point changed:', {
                from: currentPointRef.current,
                to: currentPoint.index,
                resettingMessageCounters: true
            });
            
            // Reset the counters to 0 for the new point
            lastTranscriptAnalyzedCount.current = 0;
            lastEthicalAnalyzedCount.current = 0;
            
            // Update our reference
            currentPointRef.current = currentPoint.index;
        }
    }, [currentPoint]);

    // Update messagesRef when filtered messages change
    useEffect(() => {
        const newMessageCount = filteredMessages.length

        console.log('[useAnalysisRunner] Filtered messages updated:', {
            newMessageCount,
            totalMessages: messages.length,
            lastTranscriptCount: lastTranscriptAnalyzedCount.current,
            lastEthicalCount: lastEthicalAnalyzedCount.current,
            currentPointIndex: currentPoint?.index,
            timestamp: new Date().toISOString()
        })

        messagesRef.current = filteredMessages
    }, [filteredMessages, messages, currentPoint])

    // Run transcript analysis on interval
    useEffect(() => {
        if (!discussionId || !groupId || isTimeUp) return;

        console.log('[useAnalysisRunner] Setting up transcript analysis interval')

        const runTranscriptAnalysis = async () => {
            const currentCount = messagesRef.current.length
            
            // Only run if we have new messages
            if (currentCount > lastTranscriptAnalyzedCount.current) {
                console.log('[useAnalysisRunner] Running transcript analysis for new messages')
                
                try {
                    const result = await analyzeTranscript(
                        discussionId,
                        groupId,
                        messagesRef.current,
                        currentPoint,
                        sharedAnswers
                    )
                    
                    if (result.success) {
                        lastTranscriptAnalyzedCount.current = currentCount
                    }
                    
                } catch (error) {
                    console.error('[useAnalysisRunner] Transcript analysis failed:', error)
                }
            }
        }

        // Run initial analysis
        runTranscriptAnalysis()
        
        // Set up interval
        const interval = setInterval(runTranscriptAnalysis, 15000)
        return () => clearInterval(interval)
        
    }, [discussionId, groupId, analyzeTranscript, isTimeUp, currentPoint, sharedAnswers])

    // Run ethical analysis on interval
    useEffect(() => {
        if (!discussionId || !groupId || isTimeUp) return;

        console.log('[useAnalysisRunner] Setting up ethical analysis interval')

        const runEthicalAnalysis = async () => {
            const currentCount = messagesRef.current.length
            
            // Only run if we have new messages
            if (currentCount > lastEthicalAnalyzedCount.current) {
                console.log('[useAnalysisRunner] Running ethical analysis for new messages')
                
                try {
                    const result = await analyzeEthics(
                        discussionId,
                        groupId,
                        messagesRef.current,
                        currentPoint
                    )
                    
                    if (result.success) {
                        lastEthicalAnalyzedCount.current = currentCount
                    }
                    
                } catch (error) {
                    console.error('[useAnalysisRunner] Ethical analysis failed:', error)
                }
            }
        }

        // Run initial ethical analysis
        runEthicalAnalysis()
        
        // Set up interval with a slightly offset to avoid concurrent API calls
        const interval = setInterval(runEthicalAnalysis, 20000)
        return () => clearInterval(interval)
        
    }, [discussionId, groupId, analyzeEthics, isTimeUp, currentPoint])

    return {
        isAnalyzingTranscript,
        transcriptStatus,
        isAnalyzingEthics,
        ethicsStatus,
        ethicalAnalysisResult
    }
}