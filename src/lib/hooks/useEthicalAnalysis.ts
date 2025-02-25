'use client'

import { useState, useCallback } from 'react';
import { Message, DiscussionPoint, EthicalAnalysisResult } from '@/types';

export function useEthicalAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<EthicalAnalysisResult | null>(null);

  const analyzeEthics = useCallback(async (
    sessionId: string, 
    groupId: string,
    messages: Message[],
    currentPoint: DiscussionPoint
  ) => {
    try {
      // Quick validation
      if (!currentPoint?.content || !messages?.length) {
        throw new Error('Invalid input for ethical analysis');
      }

      setIsAnalyzing(true);

      const messageData = messages.map(msg => ({
        content: msg.content,
        userId: msg.user_id,
        username: msg.username,
        created_at: msg.created_at,
        timestamp: msg.created_at ? new Date(msg.created_at).toISOString() : null
      }));

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
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ethical analysis failed');
      }

      if (data.status === 'in_progress') {
        setStatus(data.currentStatus);
        return {
          success: false,
          inProgress: true,
          message: data.message
        };
      }

      // Store the analysis result if available
      if (data.analysis) {
        setAnalysisResult(data.analysis);
      }

      return {
        success: true,
        message: data.message,
        analysis: data.analysis
      };

    } catch (error) {
      console.error('Error in ethical analysis:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
      setStatus(null);
    }
  }, []);

  return { 
    analyzeEthics,
    isAnalyzing,
    status,
    analysisResult
  };
}