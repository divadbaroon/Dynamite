import { useState, useEffect, useRef } from 'react'
import type { UseTimerProps } from '@/types'

export function useTimer({ discussion, mode, isRunning, onTimeUp }: UseTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(600)
  const [isTimeUp, setIsTimeUp] = useState(false)
  const lastSyncTime = useRef<number>(Date.now())

  // Initial timer setup based on launch time
  useEffect(() => {
    if (!discussion?.has_launched) {
      console.log('No launch time found')
      setTimeLeft(600)
      return
    }
    
    try {
      const launchTime = discussion.has_launched ? new Date(discussion.has_launched).getTime() : null
      if (!launchTime) {
        console.log('Invalid launch time')
        setTimeLeft(600)
        return
      }

      const currentTime = Date.now()
      const elapsedSeconds = Math.floor((currentTime - launchTime) / 1000)
      const remainingTime = Math.max(0, 600 - elapsedSeconds)
      
      setTimeLeft(remainingTime)
      lastSyncTime.current = currentTime
    } catch (error) {
      console.error('Error parsing launch time:', error)
      setTimeLeft(600)
    }
  }, [discussion?.has_launched])

  // Timer countdown
  useEffect(() => {
    if (!discussion?.has_launched || mode !== 'discussion' || !isRunning) return

    const countdownInterval = setInterval(() => {
      try {
        const launchTime = discussion.has_launched ? new Date(discussion.has_launched).getTime() : null
        if (!launchTime) {
          console.log('Invalid launch time during countdown')
          return
        }

        const currentTime = Date.now()
        const elapsedSeconds = Math.floor((currentTime - launchTime) / 1000)
        const remainingTime = Math.max(0, 600 - elapsedSeconds)
        
        setTimeLeft(remainingTime)
        
        if (remainingTime <= 0) {
          setIsTimeUp(true)
          onTimeUp?.()
        }
      } catch (error) {
        console.error('Error during countdown:', error)
      }
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [discussion?.has_launched, isRunning, mode, onTimeUp])

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