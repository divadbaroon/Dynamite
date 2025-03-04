"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import InstructorDashboard from './InstructorDashboard';
import { TimeProgressBar } from './ProgressBar';

// Define proper types for the context
interface TimeFilterContextType {
  timeFilter: number;
  setTimeFilter: React.Dispatch<React.SetStateAction<number>>;
  currentTimeDisplay: string;
  filteredMessagesCount: number;
  totalMessagesCount: number;
  timeRemaining: number;
  discussionStartTime: Date | null;
  discussionDuration: number;
  setCurrentTimeDisplay: React.Dispatch<React.SetStateAction<string>>;
  setFilteredMessagesCount: React.Dispatch<React.SetStateAction<number>>;
  setTotalMessagesCount: React.Dispatch<React.SetStateAction<number>>;
  formatTime: (seconds: number) => string;
}

// Create the context with proper typing
export const TimeFilterContext = createContext<TimeFilterContextType>({
  timeFilter: 100,
  setTimeFilter: () => {}, 
  currentTimeDisplay: '00:00',
  filteredMessagesCount: 0,
  totalMessagesCount: 0,
  timeRemaining: 0,
  discussionStartTime: null,
  discussionDuration: 600,
  setCurrentTimeDisplay: () => {},
  setFilteredMessagesCount: () => {},
  setTotalMessagesCount: () => {},
  formatTime: () => '00:00',
});

export function InstructorDashboardWrapper({ sessionId }: { sessionId: string }) {
  const [timeFilter, setTimeFilter] = useState(100); // Start at 100% by default
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState('10:00');
  const [filteredMessagesCount, setFilteredMessagesCount] = useState(0);
  const [totalMessagesCount, setTotalMessagesCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0); // Start with no time remaining
  const [discussionStartTime, setDiscussionStartTime] = useState<Date | null>(null);
  const [discussionDuration] = useState(600); // 10 minutes in seconds
  
  // Keep track of the last update time to prevent rapid updates
  const lastUpdateRef = useRef<number>(0);
  
  // Format time to MM:SS format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update currentTimeDisplay when timeFilter changes
  useEffect(() => {
    const currentTimeInSeconds = Math.floor((timeFilter / 100) * discussionDuration);
    setCurrentTimeDisplay(formatTime(currentTimeInSeconds));
  }, [timeFilter, discussionDuration]);

  // This function will be called by useDiscussionData to update the time remaining
  const updateTimeRemaining = useCallback((discussion: any) => {
    if (!discussion?.has_launched) {
      return;
    }
    
    const now = Date.now();
    
    // Throttle updates to prevent rapid fire updates
    // Only update if more than 500ms has passed since last update
    if (now - lastUpdateRef.current < 500) {
      return;
    }
    
    lastUpdateRef.current = now;
    
    const launchTime = new Date(discussion.has_launched).getTime();
    const currentTime = now;
    const elapsedSeconds = Math.floor((currentTime - launchTime) / 1000);
    const remainingTime = Math.max(0, 600 - elapsedSeconds);
    
    // Use functional updates to avoid dependency issues
    setTimeRemaining(remainingTime);
    setDiscussionStartTime(new Date(discussion.has_launched));
    
    // Also update the timeFilter based on the elapsed time - use functional update
    setTimeFilter((prevFilter: number) => {
      const percentComplete = Math.min(100, (elapsedSeconds / 600) * 100);
      // Only update if significantly different to avoid render loops
      return Math.abs(prevFilter - percentComplete) > 0.5 ? percentComplete : prevFilter;
    });
  }, []); // No dependencies to avoid cycles
  
  // Setup a timer to regularly update time remaining if we have a discussion start time
  useEffect(() => {
    if (!discussionStartTime) return;
    
    const intervalId = setInterval(() => {
      const launchTime = discussionStartTime.getTime();
      const currentTime = Date.now();
      const elapsedSeconds = Math.floor((currentTime - launchTime) / 1000);
      const remainingTime = Math.max(0, 600 - elapsedSeconds);
      
      setTimeRemaining(remainingTime);
      
      // Update time filter only if significant change
      setTimeFilter((prevFilter: number) => {
        const percentComplete = Math.min(100, (elapsedSeconds / 600) * 100);
        return Math.abs(prevFilter - percentComplete) > 0.5 ? percentComplete : prevFilter;
      });
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [discussionStartTime]);
  
  // Make updateTimeRemaining available on window for useDiscussionData to call
  useEffect(() => {
    // @ts-ignore - Adding custom property to window
    window.updateTimeRemaining = updateTimeRemaining;
    
    return () => {
      // @ts-ignore - Cleanup
      delete window.updateTimeRemaining;
    };
  }, [updateTimeRemaining]);
  
  return (
    <TimeFilterContext.Provider
      value={{
        timeFilter,
        setTimeFilter,
        currentTimeDisplay,
        setCurrentTimeDisplay,
        filteredMessagesCount,
        setFilteredMessagesCount,
        totalMessagesCount,
        setTotalMessagesCount,
        timeRemaining,
        discussionStartTime,
        discussionDuration,
        formatTime,
      }}
    >
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 pb-16 w-full">
          <div className="w-full overflow-y-auto">
            <InstructorDashboard 
              sessionId={sessionId} 
              updateTimeRemaining={updateTimeRemaining}
            />
          </div>
        </div>
        <TimeProgressBar
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          currentTimeDisplay={currentTimeDisplay}
          filteredCount={filteredMessagesCount}
          totalCount={totalMessagesCount}
          timeRemaining={timeRemaining}
          formatTime={formatTime}
          discussionStartTime={discussionStartTime}
        />
      </div>
    </TimeFilterContext.Provider>
  );
}

export const useTimeFilter = () => useContext(TimeFilterContext);

export default InstructorDashboardWrapper;