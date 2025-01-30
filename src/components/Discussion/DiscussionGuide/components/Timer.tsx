import { useEffect } from 'react';

interface TimerProps {
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;  
  isRunning: boolean;
  mode: string;
  isSubmitted: boolean;
  onTimeUp: () => void;
  discussionId: string;
}

export function Timer({ 
  timeLeft, 
  setTimeLeft, 
  isRunning, 
  mode, 
  isSubmitted, 
  onTimeUp
}: TimerProps) {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0 && mode === 'discussion') {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = Math.max(0, prevTime - 1);
          
          if (newTime === 0) {
            onTimeUp();
          }
          return newTime;
        });
      }, 1000);
    }
  
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isRunning, mode, timeLeft, isSubmitted, onTimeUp, setTimeLeft]);

  return null;
}