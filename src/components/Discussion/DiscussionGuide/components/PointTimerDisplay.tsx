import React, { useEffect, useState } from 'react';

interface PointTimerDisplayProps {
  pointTimeLeft: number
  currentPointDuration: number
  totalPoints: number
  currentPointIndex: number
}

export default function PointTimerDisplay({ 
  pointTimeLeft, 
  currentPointDuration, 
  totalPoints, 
  currentPointIndex
}: PointTimerDisplayProps) {
  const [width, setWidth] = useState(100);

  useEffect(() => {
    // Calculate width based on actual per-point duration
    const newWidth = (pointTimeLeft / currentPointDuration) * 100;
    setWidth(Math.max(0, Math.min(100, newWidth)));
  }, [pointTimeLeft, currentPointDuration]);

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

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Time Remaining</span>
        <span className={`text-lg font-bold ${width <= 33 ? 'text-red-500' : ''}`}>
          {formatTime(pointTimeLeft)}
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
