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
    if (!discussion?.has_launched) {
      console.log('No launch time found');
      return null;
    }
    
    // Calculate when this point should end based on its scheduled start and duration
    const startTime = new Date(discussionPoint.scheduled_start).getTime();
    const currentTime = Date.now();
    const endTime = startTime + (discussionPoint.duration * 1000);
    const remaining = Math.max(0, Math.floor((endTime - currentTime) / 1000));
    
    return remaining;
  }, [discussion?.has_launched, discussionPoint.scheduled_start, discussionPoint.duration, currentPointIndex]);

  // Initialize timer values
  useEffect(() => {
    // Reset timers when point changes
    setTimeLeft(null);
    setWidth(null);
    setIsTransitioning(false);
    
    const remainingTime = calculateTimeLeft();
    if (remainingTime === null) return;
    
    setTimeLeft(remainingTime);
    setWidth((remainingTime / discussionPoint.duration) * 100);
  }, [calculateTimeLeft, discussionPoint.duration, currentPointIndex]);

    // Handle point transition
    const handleTimeUp = useCallback(async () => {
      if (!isTransitioning && onTimeUp) {
        setIsTransitioning(true);
        await onTimeUp();
        setIsTransitioning(false);
      }
    }, [isTransitioning, onTimeUp]);

  // Timer effect
  useEffect(() => {
    if (!isRunning || isTransitioning || timeLeft === null || !discussion?.has_launched) return;

    let timeoutId: NodeJS.Timeout | null = null;

    const checkAndHandleTimeUp = () => {
      const currentRemaining = calculateTimeLeft();
      if (currentRemaining !== null && currentRemaining <= 0 && !isTransitioning) {
        timeoutId = setTimeout(() => {
          handleTimeUp();
        }, 0);
      }
    };
    

    // Regular countdown
    const countdownInterval = setInterval(() => {
      const currentRemaining = calculateTimeLeft();
      if (currentRemaining === null) return;
      
      setTimeLeft(currentRemaining);
      setWidth((currentRemaining / discussionPoint.duration) * 100);
      
      if (currentRemaining <= 0) {
        checkAndHandleTimeUp();
      }
    }, 1000);

    // Initial check
    checkAndHandleTimeUp();

    return () => {
      clearInterval(countdownInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    isRunning,
    isTransitioning,
    discussion?.has_launched,
    calculateTimeLeft,
    timeLeft,
    handleTimeUp,
    discussionPoint.duration
  ]);



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