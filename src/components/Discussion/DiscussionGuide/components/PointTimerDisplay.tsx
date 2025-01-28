interface PointTimerDisplayProps {
  pointTimeLeft: number;
  totalPoints: number;
  currentPointIndex: number;
}

export function PointTimerDisplay({ 
  pointTimeLeft, 
  totalPoints, 
  currentPointIndex 
}: PointTimerDisplayProps) {
  const getTimerColor = (timeLeft: number) => {
    if (timeLeft > 120) return 'bg-green-500';
    if (timeLeft > 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Time Remaining</span>
        <span className={`text-lg font-bold ${pointTimeLeft <= 60 ? 'text-red-500' : ''}`}>
          {Math.floor(pointTimeLeft / 60)}:{(pointTimeLeft % 60).toString().padStart(2, '0')}
        </span>
      </div>
      
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getTimerColor(pointTimeLeft)} transition-all duration-300`}
          style={{ 
            width: `${(pointTimeLeft / 180) * 100}%`,
            transition: 'width 1s linear'
          }}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>Discussion Point {currentPointIndex + 1} of {totalPoints}</span>
        {pointTimeLeft <= 30 && (
          <span className="text-red-500 font-medium animate-pulse">
            Wrapping up soon...
          </span>
        )}
      </div>
    </div>
  );
}