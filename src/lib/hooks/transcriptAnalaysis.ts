'use client'

import { useState, useCallback } from 'react';
import { Message } from '@/types';

export function useTranscriptAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const analyzeTranscript = useCallback(async (
    sessionId: string, 
    groupId: string,
    messages: Message[]
  ) => {
    try {
      setIsAnalyzing(true);

      // Extract relevant message data for analysis
      const messageData = messages.map(msg => ({
        content: msg.content,
        userId: msg.user_id,
        username: msg.username,
        timestamp: msg.created_at
      }));

      const response = await fetch(`/api/transcriptAnalysis/${groupId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionId,
          messages: messageData 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Analysis failed');
      }

      if (data.status === 'in_progress') {
        setStatus(data.currentStatus);
        return {
          success: false,
          inProgress: true,
          message: data.message
        };
      }

      return {
        success: true,
        message: data.message
      };

    } catch (error) {
      console.error('Error in transcript analysis:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
      setStatus(null);
    }
  }, []);

  return { 
    analyzeTranscript,
    isAnalyzing,
    status
  };
}