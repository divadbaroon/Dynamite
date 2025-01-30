import React, { useEffect, useState } from 'react';
import { PointTimerDisplayProps } from '@/types';

export default function PointTimerDisplay({
  discussionPoint,
  currentPointIndex,
  totalPoints,
  isRunning,
  onTimeUp
}: PointTimerDisplayProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Initialize timer values
  useEffect(() => {
    const startTime = new Date(discussionPoint.scheduled_start).getTime();
    const currentTime = Date.now();
    const endTime = startTime + (discussionPoint.duration * 1000);
    const remainingTime = Math.max(0, Math.floor((endTime - currentTime) / 1000));
    
    setTimeLeft(remainingTime);
    setWidth((remainingTime / discussionPoint.duration) * 100);
  }, [discussionPoint]);

  // Handle point transition
  const handleTimeUp = async () => {
    if (!isTransitioning && onTimeUp) {
      setIsTransitioning(true);
      await onTimeUp();
      setIsTransitioning(false);
    }
  };

  // Timer effect
  useEffect(() => {
    if (!isRunning || isTransitioning || timeLeft === null) return;

    const timer = setInterval(() => {
      const startTime = new Date(discussionPoint.scheduled_start).getTime();
      const currentTime = Date.now();
      const endTime = startTime + (discussionPoint.duration * 1000);
      const newTimeLeft = Math.max(0, Math.floor((endTime - currentTime) / 1000));

      if (newTimeLeft <= 0 && !isTransitioning) {
        handleTimeUp();
      }

      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, isTransitioning, discussionPoint, timeLeft]);

  // Update width based on time left
  useEffect(() => {
    if (timeLeft === null) return;
    setWidth((timeLeft / discussionPoint.duration) * 100);
  }, [timeLeft, discussionPoint.duration]);

  // Reset timer when discussion point changes
  useEffect(() => {
    const startTime = new Date(discussionPoint.scheduled_start).getTime();
    const currentTime = Date.now();
    const endTime = startTime + (discussionPoint.duration * 1000);
    const remainingTime = Math.max(0, Math.floor((endTime - currentTime) / 1000));
    
    setTimeLeft(remainingTime);
    setWidth((remainingTime / discussionPoint.duration) * 100);
    setIsTransitioning(false);
  }, [discussionPoint]);

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