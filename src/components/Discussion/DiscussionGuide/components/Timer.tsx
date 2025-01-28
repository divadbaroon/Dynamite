import { useEffect } from 'react';

interface TimerProps {
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;  
  isRunning: boolean;
  mode: string;
  isSubmitted: boolean;
  onTimeUp: () => void;
  discussionId: string
}

export function Timer({ 
  timeLeft, 
  setTimeLeft, 
  isRunning, 
  mode, 
  isSubmitted, 
  onTimeUp,
  discussionId
}: TimerProps) {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0 && mode === 'discussion') {
      localStorage.setItem(`${discussionId}-timeLeft`, timeLeft.toString());
      localStorage.setItem(`${discussionId}-timerTimestamp`, Date.now().toString());
      
      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = Math.max(0, prevTime - 1);
          
          localStorage.setItem(`${discussionId}-timeLeft`, newTime.toString());
          localStorage.setItem(`${discussionId}-timerTimestamp`, Date.now().toString());
          
          if (newTime === 0) {
            localStorage.setItem(`${discussionId}-isTimeUp`, 'true');
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