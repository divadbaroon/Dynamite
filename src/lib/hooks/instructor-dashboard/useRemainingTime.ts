import { useState, useEffect, useRef } from 'react';

interface UseRemainingTimeProps {
  discussionLaunchTime: string | Date | null;
  totalDuration: number; // in seconds
  onTimeUp?: () => void;
}

export function useRemainingTime({ 
  discussionLaunchTime, 
  totalDuration, 
  onTimeUp 
}: UseRemainingTimeProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(totalDuration);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const lastSyncTime = useRef<number>(Date.now());
  const localOffset = useRef<number>(0);
  const timeRemainingRef = useRef<number>(totalDuration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initial setup based on launch time
  useEffect(() => {
    if (!discussionLaunchTime) {
      setTimeRemaining(totalDuration);
      return;
    }
    
    // Calculate initial time remaining
    const launchTime = new Date(discussionLaunchTime).getTime();
    const currentTime = Date.now();
    const elapsedSeconds = Math.floor((currentTime - launchTime) / 1000);
    const remainingTime = Math.max(0, totalDuration - elapsedSeconds);
    
    setTimeRemaining(remainingTime);
    lastSyncTime.current = currentTime;
    localOffset.current = 0;

    if (remainingTime <= 0 && !isTimeUp) {
      setIsTimeUp(true);
      onTimeUp?.();
    }
  }, [discussionLaunchTime, totalDuration, onTimeUp, isTimeUp]);

  // Setup timer and periodic sync
  useEffect(() => {
    if (!discussionLaunchTime) return;

    // Function to sync with the server time
    const syncTimeWithServer = () => {
      const launchTime = new Date(discussionLaunchTime).getTime();
      const currentTime = Date.now();
      const elapsedSeconds = Math.floor((currentTime - launchTime) / 1000);
      const serverRemainingTime = Math.max(0, totalDuration - elapsedSeconds);
      
      // Calculate local time drift
      const localElapsed = Math.floor((currentTime - lastSyncTime.current) / 1000);
      // Use a ref to get the current timeRemaining value to avoid dependency issues
      const currentTimeRemaining = timeRemainingRef.current;
      const expectedTimeLeft = currentTimeRemaining - localElapsed;
      const drift = serverRemainingTime - expectedTimeLeft;

      // Only adjust if drift is significant (more than 1 second)
      if (Math.abs(drift) > 1) {
        // Store the drift to gradually correct it
        localOffset.current = drift;
        setTimeRemaining(serverRemainingTime);
      }

      lastSyncTime.current = currentTime;

      if (serverRemainingTime <= 0 && !isTimeUp) {
        setIsTimeUp(true);
        onTimeUp?.();
      }
    };

    // Initial sync
    syncTimeWithServer();

    // Set up periodic sync (every 10 seconds)
    const syncInterval = setInterval(syncTimeWithServer, 10000);
    
    // Regular countdown with smooth drift correction
    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        // Store current value in ref to avoid dependency issues
        timeRemainingRef.current = prev;
        
        let newTime = prev - 1;
        
        // Apply a fraction of the offset correction per second
        if (localOffset.current !== 0) {
          // Apply 10% of the correction each second
          const correction = localOffset.current > 0 ? 
            -Math.min(0.1, Math.abs(localOffset.current)) : 
            Math.min(0.1, Math.abs(localOffset.current));
          
          localOffset.current -= correction;
          newTime += correction;
        }

        // Ensure we don't go below zero
        newTime = Math.max(0, Math.round(newTime));
        
        if (newTime <= 0 && !isTimeUp) {
          setIsTimeUp(true);
          onTimeUp?.();
        }
        
        return newTime;
      });
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(syncInterval);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [discussionLaunchTime, totalDuration, onTimeUp, isTimeUp]);

  // Helper function to format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining,
    isTimeUp,
    formatTime,
    // Expose a manual update method if needed
    updateTime: () => {
      if (!discussionLaunchTime) return;
      
      const launchTime = new Date(discussionLaunchTime).getTime();
      const currentTime = Date.now();
      const elapsedSeconds = Math.floor((currentTime - launchTime) / 1000);
      const remainingTime = Math.max(0, totalDuration - elapsedSeconds);
      
      setTimeRemaining(remainingTime);
      lastSyncTime.current = currentTime;
    }
  };
}