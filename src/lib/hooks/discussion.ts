import { useState, useEffect } from 'react'
import { getDiscussionById } from '@/lib/actions/discussion'

import { UseDiscussionProps } from "@/types"

export function useDiscussion({ discussionId, setCurrentPointIndex }: UseDiscussionProps) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!discussionId) return

    const getCurrentDiscussion = async () => {
      try {
        const { discussion: currentDiscussion, error } = await getDiscussionById(discussionId)
        console.log("Discussion from DB:", currentDiscussion)
        if (error) throw error

        if (currentDiscussion.current_point !== undefined) {
          setCurrentPointIndex(currentDiscussion.current_point)
        }
      } catch (error) {
        console.log('Error fetching session:', error)
      } finally {
        setLoading(false)
      }
    }

    getCurrentDiscussion()
  }, [discussionId, setCurrentPointIndex])

  return { loading }
}