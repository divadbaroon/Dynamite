"use client";

import React, { createContext, useContext, useState } from 'react';
import InstructorDashboard from './InstructorDashboard';
import { TimeProgressBar } from './ProgressBar';

export const TimeFilterContext = createContext({
  timeFilter: 100,
  setTimeFilter: (_: number) => {}, 
  currentTimeDisplay: '00:00',
  filteredMessagesCount: 0,
  totalMessagesCount: 0,
  setCurrentTimeDisplay: (_: string) => {},
  setFilteredMessagesCount: (_: number) => {},
  setTotalMessagesCount: (_: number) => {},
});

export function InstructorDashboardWrapper({ sessionId }: { sessionId: string }) {
  const [timeFilter, setTimeFilter] = useState(0);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState('00:00');
  const [filteredMessagesCount, setFilteredMessagesCount] = useState(0);
  const [totalMessagesCount, setTotalMessagesCount] = useState(0);

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
      }}
    >
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 pb-16 w-full">
          <div className="w-full overflow-y-auto">
            <InstructorDashboard sessionId={sessionId} />
          </div>
        </div>
        <TimeProgressBar
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          currentTimeDisplay={currentTimeDisplay}
          filteredCount={filteredMessagesCount}
          totalCount={totalMessagesCount}
        />
      </div>
    </TimeFilterContext.Provider>
  );
}

export const useTimeFilter = () => useContext(TimeFilterContext);

export default InstructorDashboardWrapper;