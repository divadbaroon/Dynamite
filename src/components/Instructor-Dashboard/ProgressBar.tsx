"use client";

import React, { useEffect, useRef, useState } from 'react';
import { SkipBack, SkipForward, Play, Pause } from 'lucide-react';
import { Button } from "@/components/ui/button";

import { TimeProgressBarProps } from "@/types"

export function TimeProgressBar({
  timeFilter,
  setTimeFilter,
}: TimeProgressBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [duration] = useState("10:00"); // 10 minutes total duration
  
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Handle auto-advance when playing
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (isPlaying && !isDragging) {
      interval = setInterval(() => {
        if (timeFilter >= 100) {
          setIsPlaying(false);
        } else {
          // Increase by 0.1667 so that (0.1667/100)*10 minutes = 1 second per tick
          setTimeFilter(Math.min(timeFilter + 0.1667, 100));
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isDragging, timeFilter, setTimeFilter]);
  
  // Handle drag interactions
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !progressBarRef.current) return;
      
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      setTimeFilter(Math.max(0, Math.min(percentage, 100)));
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, setTimeFilter]);

  const handleThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleTimeSkip = (direction: 'back' | 'forward') => {
    const change = direction === 'back' ? -5 : 5;
    const newValue = Math.max(0, Math.min(100, timeFilter + change));
    setTimeFilter(newValue);
  };
  
  const handlePlayPause = () => {
    if (timeFilter >= 100) {
      setTimeFilter(0);
    }
    setIsPlaying(!isPlaying);
  };

  // Format time for display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

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
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => handleTimeSkip('forward')}
              className="h-8 w-8"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Timeline display */}
          <div className="flex-grow flex items-center space-x-4">
            <span className="text-sm font-medium tabular-nums">
              {formatTime(Math.floor(600 * timeFilter / 100))}
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
      </div>
    </div>
  );
}
