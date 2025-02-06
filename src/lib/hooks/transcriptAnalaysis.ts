"use client"

import { useCallback } from 'react';
import { analyzeTranscript as analyzeTranscriptAction } from '@/lib/actions/transcript'; 

export function useTranscriptAnalysis() {
  const analyzeTranscript = useCallback(async (discussionId: string, groupId: string) => {
    try {
      const result = await analyzeTranscriptAction(discussionId, groupId);
      return result;
    } catch (error) {
      console.error('Error in transcript analysis:', error);
      throw error;
    }
  }, []);

  return { analyzeTranscript };
}