import { useEffect } from 'react'
import { analyzeTranscript } from '@/lib/actions/transcript'

export function useTranscriptAnalysis(discussionId: string | undefined, groupId: string) {
  useEffect(() => {
    if (!discussionId || !groupId) return

    const runAnalysis = async () => {
      try {
        const result = await analyzeTranscript(groupId, discussionId)
        console.log('Transcript analysis result:', result)
        if (!result.success) {
          console.log('Transcript analysis failed:', result.error)
        }
      } catch (error) {
        console.log('Error running transcript analysis:', error)
      }
    }

    const intervalId = setInterval(runAnalysis, 1 * 10 * 1000)
    return () => clearInterval(intervalId)
  }, [discussionId, groupId])
}