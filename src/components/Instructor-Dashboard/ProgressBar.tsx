"use client";

import React, { useEffect, useRef, useState } from 'react';
import { SkipBack, SkipForward, Play, Pause } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Extended TimeProgressBarProps with new properties
interface TimeProgressBarProps {
  timeFilter: number;
  setTimeFilter: React.Dispatch<React.SetStateAction<number>>; // Correct typing for setState
  currentTimeDisplay: string;
  filteredCount: number;
  totalCount: number;
  timeRemaining: number;
  formatTime: (seconds: number) => string;
  discussionStartTime?: Date | null;
}

export function TimeProgressBar({
  timeFilter,
  setTimeFilter,
  currentTimeDisplay,
  filteredCount,
  totalCount,
  timeRemaining,
  formatTime,
  discussionStartTime
}: TimeProgressBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [duration] = useState("10:00"); // 10 minutes total duration
  const [maxAllowedProgress, setMaxAllowedProgress] = useState(100);
  
  const progressBarRef = useRef<HTMLDivElement>(null);
  const totalDurationInSeconds = 600; // 10 minutes in seconds
  
  // Calculate and update the maximum allowed progress
  useEffect(() => {
    if (!discussionStartTime) return;
    
    const updateMaxAllowedProgress = () => {
      const now = Date.now();
      const launchTime = discussionStartTime.getTime();
      const elapsedSeconds = Math.floor((now - launchTime) / 1000);
      const elapsedPercentage = Math.min(100, (elapsedSeconds / totalDurationInSeconds) * 100);
      
      setMaxAllowedProgress(elapsedPercentage);
    };
    
    // Initial calculation
    updateMaxAllowedProgress();
    
    // Update every second
    const intervalId = setInterval(updateMaxAllowedProgress, 1000);
    
    return () => clearInterval(intervalId);
  }, [discussionStartTime]);
  
  // Handle auto-advance when playing
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (isPlaying && !isDragging) {
      interval = setInterval(() => {
        // Make TypeScript happy with the function signature
        setTimeFilter((prevFilter: number) => {
          // When playing, don't let it go past the max allowed
          const nextValue = Math.min(prevFilter + 0.1667, maxAllowedProgress);
          
          if (nextValue >= maxAllowedProgress) {
            setIsPlaying(false);
          }
          
          return nextValue;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isDragging, setTimeFilter, maxAllowedProgress]);
  
  // Handle drag interactions
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !progressBarRef.current) return;
      
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let percentage = (x / rect.width) * 100;
      
      // Don't allow dragging past the current actual time
      percentage = Math.min(percentage, maxAllowedProgress);
      
      setTimeFilter(Math.max(0, Math.min(percentage, 100)));
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, setTimeFilter, maxAllowedProgress]);

  const handleThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleTimeSkip = (direction: 'back' | 'forward') => {
    if (direction === 'back') {
      // Can always go back
      const newValue = Math.max(0, timeFilter - 5);
      setTimeFilter(newValue);
    } else {
      // Can only go forward up to max allowed
      const newValue = Math.min(maxAllowedProgress, timeFilter + 5);
      setTimeFilter(newValue);
    }
  };
  
  const handlePlayPause = () => {
    if (timeFilter >= maxAllowedProgress) {
      // If at the end, restart from beginning
      setTimeFilter(0);
    }
    setIsPlaying(!isPlaying);
  };

  // Determine what to show for time remaining
  const getTimeRemainingDisplay = () => {
    // If timeFilter is at 100%, discussion is over
    if (timeFilter >= 100) return "0:00";
    
    // If we have a valid timeRemaining value, use it
    if (typeof timeRemaining === 'number' && timeRemaining >= 0) {
      return formatTime(timeRemaining);
    }
    
    // Default fallback
    return "0:00";
  };

  // Is the forward button disabled?
  const isForwardDisabled = timeFilter >= maxAllowedProgress;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 p-4 z-10">
      <div className="max-w-3xl mx-auto flex flex-col space-y-2">
        <div className="flex items-center space-x-4 justify-center">
          <div className="flex space-x-1">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => handleTimeSkip('back')}
              className="h-8 w-8"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handlePlayPause}
              className="h-8 w-8"
              disabled={isForwardDisabled && isPlaying}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => handleTimeSkip('forward')}
              className="h-8 w-8"
              disabled={isForwardDisabled}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Timeline display */}
          <div className="flex-grow flex items-center space-x-4">
            <span className="text-sm font-medium tabular-nums">
              {currentTimeDisplay}
            </span>

            <div
              ref={progressBarRef}
              className="relative w-full h-2 bg-gray-300 rounded-full"
            >
              {/* Black line behind the thumb */}
              <div
                className="absolute top-1/2 w-full h-[2px] bg-black"
                style={{ transform: "translateY(-50%)" }}
              />
              
              {/* Indicator for current maximum allowed progress */}
              {maxAllowedProgress < 100 && (
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-red-500"
                  style={{ 
                    left: `${maxAllowedProgress}%`,
                    height: '8px',
                    marginTop: '-3px'
                  }}
                  title="Current time"
                />
              )}

              {/* Filled portion */}
              <div
                className="absolute top-0 left-0 h-full bg-black rounded-full"
                style={{ width: `${timeFilter}%` }}
              />

              {/* Draggable thumb */}
              <div
                className="absolute top-1/2 w-4 h-4 bg-white border-2 border-black rounded-full shadow cursor-pointer"
                style={{
                  transform: "translate(-50%, -50%)",
                  left: `${timeFilter}%`,
                }}
                onMouseDown={handleThumbMouseDown}
              />
            </div>

            <span className="text-sm font-medium tabular-nums">
              {duration}
            </span>
          </div>
        </div>
        
        {/* Additional information display */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            Messages: {filteredCount}/{totalCount}
          </span>
          <span>
            Time Remaining: {getTimeRemainingDisplay()}
          </span>
        </div>
      </div>
    </div>
  );
}