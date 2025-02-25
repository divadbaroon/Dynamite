import { useState, useCallback } from 'react'
import { Message, DiscussionPoint } from '@/types'
import { saveEthicalPerspectives } from '@/lib/actions/ethical-perspectives'

import { AnalysisResponse } from "@/types"

export function useEthicalAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const analyzeEthicalPerspectives = useCallback(async (
    sessionId: string,
    groupId: string,
    messages: Message[],
    currentPoint: DiscussionPoint
  ): Promise<AnalysisResponse> => {
    try {
      if (!currentPoint?.content || !messages?.length) {
        throw new Error('Invalid input for ethical analysis')
      }

      setIsAnalyzing(true)

      const messageData = messages.map(msg => ({
        content: msg.content,
        userId: msg.user_id,
        username: msg.username,
        timestamp: msg.created_at
      }))

      const response = await fetch(`/api/ethicalAnalysis/${groupId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          messages: messageData,
          currentPoint
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Analysis failed')
      }

      if (data.status === 'in_progress') {
        setStatus(data.currentStatus)
        return {
          success: false,
          inProgress: true,
          message: data.message
        }
      }

      // Save the perspectives to the database
      if (data.analysis?.perspectives?.length > 0) {
        await saveEthicalPerspectives(
          sessionId,
          groupId,
          currentPoint.index,
          data.analysis.perspectives
        )
      }

      return {
        success: true,
        message: data.message,
        analysis: data.analysis
      }

    } catch (error) {
      console.error('Error in ethical analysis:', error)
      throw error
    } finally {
      setIsAnalyzing(false)
      setStatus(null)
    }
  }, [])

  return {
    analyzeEthicalPerspectives,
    isAnalyzing,
    status
  }
}