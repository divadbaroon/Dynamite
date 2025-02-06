import { useState, useEffect } from 'react'
import type { Discussion, UseTimerProps } from '@/types'

export function useTimer({ discussion, mode, isRunning, onTimeUp }: UseTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(600)
  const [isTimeUp, setIsTimeUp] = useState(false)

  // Initial timer setup based on launch time
  useEffect(() => {
    if (!discussion?.has_launched) {
      console.log('No launch time found')
      setTimeLeft(600)
      return
    }
    
    const launchTime = new Date(discussion.has_launched).getTime()
    const currentTime = Date.now()
    const elapsedSeconds = Math.floor((currentTime - launchTime) / 1000)
    const remainingTime = Math.max(0, 600 - elapsedSeconds)
    
    console.log("Launched Time", launchTime)
    console.log("Current Time", currentTime)
    console.log("Elapsed Time", elapsedSeconds)
    console.log("Remaining Time", remainingTime)

    setTimeLeft(remainingTime)
  }, [discussion?.has_launched])

  // Timer sync and countdown
  useEffect(() => {
    if (!discussion?.has_launched || mode !== 'discussion' || !isRunning) return

    const syncTimeWithServer = () => {
      if (!discussion.has_launched) return
    
      const launchedAt = new Date(discussion.has_launched).getTime()
      const currentTime = Date.now()
      const elapsedSeconds = Math.floor((currentTime - launchedAt) / 1000)
      const remainingTime = Math.max(0, 600 - elapsedSeconds)
    
      // Only update if the difference is more than 2 seconds
      if (Math.abs(remainingTime - timeLeft) > 2) {
        setTimeLeft(remainingTime)
      }
    
      if (remainingTime <= 0) {
        setIsTimeUp(true)
        onTimeUp?.()
      }
    }

    // Initial sync
    syncTimeWithServer()

    // Set up periodic sync
    const syncInterval = setInterval(syncTimeWithServer, 5000)
    
    // Regular countdown
    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1)
        if (newTime <= 0) {
          setIsTimeUp(true)
          onTimeUp?.()
        }
        return newTime
      })
    }, 1000)

    return () => {
      clearInterval(syncInterval)
      clearInterval(countdownInterval)
    }
  }, [discussion?.has_launched, isRunning, mode, timeLeft, onTimeUp])

  // Handle time up side effect
  useEffect(() => {
    if (isTimeUp) {
      onTimeUp?.()
    }
  }, [isTimeUp, onTimeUp])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return {
    timeLeft,
    setTimeLeft,
    isTimeUp,
    setIsTimeUp,
    formatTime
  }
}