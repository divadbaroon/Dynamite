import { useState, useEffect, useRef } from 'react'
import type { UseTimerProps } from '@/types'

export function useTimer({ discussion, mode, isRunning, onTimeUp }: UseTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(600)
  const [isTimeUp, setIsTimeUp] = useState(false)
  const lastSyncTime = useRef<number>(Date.now())
  const localOffset = useRef<number>(0)

  // Initial timer setup based on launch time
  useEffect(() => {
    if (!discussion?.has_launched) {
      setTimeLeft(600)
      return
    }
    
    const launchTime = new Date(discussion.has_launched).getTime()
    const currentTime = Date.now()
    const elapsedSeconds = Math.floor((currentTime - launchTime) / 1000)
    const remainingTime = Math.max(0, 600 - elapsedSeconds)
    
    setTimeLeft(remainingTime)
    lastSyncTime.current = currentTime
    localOffset.current = 0
  }, [discussion?.has_launched])

  // Timer sync and countdown
  useEffect(() => {
    if (!discussion?.has_launched || mode !== 'discussion' || !isRunning) return

    const syncTimeWithServer = () => {
      if (!discussion.has_launched) return
    
      const launchedAt = new Date(discussion.has_launched).getTime()
      const currentTime = Date.now()
      const elapsedSeconds = Math.floor((currentTime - launchedAt) / 1000)
      const serverRemainingTime = Math.max(0, 600 - elapsedSeconds)
      
      // Calculate local time drift
      const localElapsed = Math.floor((currentTime - lastSyncTime.current) / 1000)
      const expectedTimeLeft = timeLeft - localElapsed
      const drift = serverRemainingTime - expectedTimeLeft

      // Only adjust if drift is significant (more than 1 second)
      if (Math.abs(drift) > 1) {
        // Gradually correct the drift over the next few seconds
        localOffset.current = drift
        setTimeLeft(serverRemainingTime)
      }

      lastSyncTime.current = currentTime

      if (serverRemainingTime <= 0) {
        setIsTimeUp(true)
        onTimeUp?.()
      }
    }

    // Initial sync
    syncTimeWithServer()

    // Set up periodic sync (less frequent)
    const syncInterval = setInterval(syncTimeWithServer, 10000)
    
    // Regular countdown with smooth drift correction
    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => {
        let newTime = prev - 1
        
        // Apply a fraction of the offset correction
        if (localOffset.current !== 0) {
          const correction = localOffset.current > 0 ? -0.1 : 0.1
          localOffset.current += correction
          newTime += correction
        }

        newTime = Math.max(0, Math.round(newTime))
        
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