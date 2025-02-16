"use client"

import { useState, useEffect, useCallback } from 'react'

interface UseReviewDialogProps {
  isTimeUp: boolean
}

export function useReviewDialog({ isTimeUp }: UseReviewDialogProps) {
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false)

  useEffect(() => {
    if (isTimeUp) {
      setIsReviewOpen(true)
    }
  }, [isTimeUp])

  const handleReview = useCallback((): void => {
    setIsReviewOpen(true)
  }, [])

  return {
    isReviewOpen,
    setIsReviewOpen,
    handleReview
  }
}