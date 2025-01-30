import React, { useEffect, useState, useCallback } from 'react';
import { PointTimerDisplayProps } from '@/types';

export default function PointTimerDisplay({
  discussion,
  discussionPoint,
  currentPointIndex,
  totalPoints,
  isRunning,
  onTimeUp
}: PointTimerDisplayProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const calculateTimeLeft = useCallback(() => {
    if (!discussion?.has_launched) return null;
    
    const launchTime = new Date(discussion.has_launched).getTime();
    const pointStartTime = launchTime + (currentPointIndex * discussionPoint.duration * 1000);
    const currentTime = Date.now();
    const endTime = pointStartTime + (discussionPoint.duration * 1000);
    return Math.max(0, Math.floor((endTime - currentTime) / 1000));
  }, [discussion?.has_launched, currentPointIndex, discussionPoint.duration]);

  // Handle point transition
  const handleTimeUp = useCallback(async () => {
    if (!isTransitioning && onTimeUp) {
      setIsTransitioning(true);
      await onTimeUp();
      setIsTransitioning(false);
    }
  }, [isTransitioning, onTimeUp]);

  // Initialize timer values
  useEffect(() => {
    const remainingTime = calculateTimeLeft();
    if (remainingTime === null) return;
    
    setTimeLeft(remainingTime);
    setWidth((remainingTime / discussionPoint.duration) * 100);
  }, [calculateTimeLeft, discussionPoint.duration]);

  // Timer effect
  useEffect(() => {
    if (!isRunning || isTransitioning || timeLeft === null || !discussion?.has_launched) return;

    let timeoutId: NodeJS.Timeout | null = null;

    const checkAndHandleTimeUp = () => {
      if (timeLeft <= 0 && !isTransitioning) {
        // Use setTimeout to avoid state updates during render
        timeoutId = setTimeout(() => {
          handleTimeUp();
        }, 0);
      }
    };

    // Regular countdown
    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        const newTime = Math.max(0, prev - 1);
        return newTime;
      });
    }, 1000);

    // Periodic sync with server time
    const syncInterval = setInterval(() => {
      const serverTimeLeft = calculateTimeLeft();
      if (serverTimeLeft === null) return;

      if (Math.abs(serverTimeLeft - (timeLeft || 0)) > 2) {
        setTimeLeft(serverTimeLeft);
      }
    }, 5000);

    // Check time up condition
    checkAndHandleTimeUp();

    return () => {
      clearInterval(countdownInterval);
      clearInterval(syncInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    isRunning,
    isTransitioning,
    discussion?.has_launched,
    calculateTimeLeft,
    timeLeft,
    handleTimeUp
  ]);

  // Update width based on time left
  useEffect(() => {
    if (timeLeft === null) return;
    setWidth((timeLeft / discussionPoint.duration) * 100);
  }, [timeLeft, discussionPoint.duration]);

  const getTimerColor = (percentage: number) => {
    if (percentage > 66) return 'bg-green-500';
    if (percentage > 33) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (timeLeft === null || width === null) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Time Remaining</span>
        <span className={`text-lg font-bold ${width <= 33 ? 'text-red-500' : ''}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`${getTimerColor(width)} h-full transition-all duration-500 ease-linear`}
          style={{ width: `${width}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>
          Discussion Point {currentPointIndex + 1} of {totalPoints}
        </span>
        {width <= 16.6 && (
          <span className="text-red-500 font-medium animate-pulse">
            Wrapping up soon...
          </span>
        )}
      </div>
    </div>
  );
}