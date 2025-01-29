import React, { useEffect, useState } from 'react';

interface PointTimerDisplayProps {
  pointTimeLeft: number;
  totalPoints: number;
  currentPointIndex: number;
  timeLeft: number;  
}

export default function PointTimerDisplay({ 
  pointTimeLeft, 
  totalPoints, 
  currentPointIndex,
  timeLeft
}: PointTimerDisplayProps) {
  const [prevTime, setPrevTime] = useState(pointTimeLeft);
  const [width, setWidth] = useState(100);

  // Calculate the dynamic point duration based on remaining time and points
  const remainingPoints = totalPoints - currentPointIndex;
  const pointDuration = Math.floor(timeLeft / remainingPoints);

  useEffect(() => {
    if (pointTimeLeft > prevTime) {
      setPrevTime(pointTimeLeft);
    }
    
    const newWidth = (pointTimeLeft / pointDuration) * 100;
    setWidth(Math.max(0, Math.min(100, newWidth)));
    
    setPrevTime(pointTimeLeft);
  }, [pointTimeLeft, pointDuration, prevTime]);

  const getTimerColor = (timeLeft: number) => {
    if (timeLeft > pointDuration * 0.66) return 'bg-green-500';
    if (timeLeft > pointDuration * 0.33) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Time Remaining</span>
        <span className={`text-lg font-bold ${pointTimeLeft <= pointDuration * 0.33 ? 'text-red-500' : ''}`}>
          {formatTime(pointTimeLeft)}
        </span>
      </div>
      
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getTimerColor(pointTimeLeft)} transition-all duration-1000`}
          style={{ 
            width: `${width}%`,
            transitionTimingFunction: 'linear'
          }}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>Discussion Point {currentPointIndex + 1} of {totalPoints}</span>
        {pointTimeLeft <= pointDuration * 0.166 && (
          <span className="text-red-500 font-medium animate-pulse">
            Wrapping up soon...
          </span>
        )}
      </div>
    </div>
  );
}