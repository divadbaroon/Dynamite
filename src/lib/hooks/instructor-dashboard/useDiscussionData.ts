import { useEffect, useState, useCallback, useRef } from 'react';
import { Discussion, Message, SharedAnswers } from "@/types";
import { getDiscussionById } from "@/lib/actions/discussion";
import { fetchSessionMessages } from "@/lib/actions/message";
import { fetchSessionSharedAnswers } from "@/lib/actions/shared-answers";
import { fetchSessionEthicalPerspectives } from "@/lib/actions/ethical-perspectives";
import { getCommonAnalysisBySession } from "@/lib/actions/analysis";
import { getGroupById } from "@/lib/actions/group";
import { fetchUsersBySession } from "@/lib/actions/user";

interface PerspectiveEntry {
  perspectives: {
    framework: string;
    [key: string]: any;
  }[];
  [key: string]: any;
}

interface PerspectivesData {
  [key: number]: PerspectiveEntry[];
}

interface SharedAnswersData {
  [key: string]: SharedAnswers;
}

interface FrequencyEntry {
  frequency: number;
  timestamp: string;
}

interface CommonAnalysisData {
  frameworks: Record<string, FrequencyEntry[]>;
  groupAnswers: Record<string, FrequencyEntry[]>;
}

interface UseDiscussionDataProps {
  sessionId: string;
  timeFilter: number;
  setCurrentTimeDisplay: (time: string) => void;
  setFilteredMessagesCount: (count: number) => void;
  setTotalMessagesCount: (count: number) => void;
}

export function useDiscussionData({
  sessionId,
  timeFilter,
  setCurrentTimeDisplay,
  setFilteredMessagesCount,
  setTotalMessagesCount
}: UseDiscussionDataProps) {
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('10:00');
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [filteredMessages, setFilteredMessages] = useState<Message[] | null>(null);
  const [sharedAnswers, setSharedAnswers] = useState<SharedAnswersData | null>(null);
  const [ethicalPerspectives, setEthicalPerspectives] = useState<PerspectivesData | null>(null);
  const [commonAnalysis, setCommonAnalysis] = useState<CommonAnalysisData | null>(null);
  const [groupMapping, setGroupMapping] = useState<Record<string, number>>({});
  const [discussionStartTime, setDiscussionStartTime] = useState<Date | null>(null);
  const [discussionDuration, setDiscussionDuration] = useState<number>(0);
  const [activeStudents, setActiveStudents] = useState<number>(0);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [participationRate, setParticipationRate] = useState<number>(0);
  const [usersData, setUsersData] = useState<any[] | null>(null);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);

  // Use refs to prevent infinite loops with callbacks
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  
  const discussionStartTimeRef = useRef(discussionStartTime);
  discussionStartTimeRef.current = discussionStartTime;
  
  const discussionDurationRef = useRef(discussionDuration);
  discussionDurationRef.current = discussionDuration;

  const usersDataRef = useRef(usersData);
  usersDataRef.current = usersData;

  // Update time remaining based on progress bar position
  useEffect(() => {
    // Start with 10 minutes and decrease based on timeFilter
    const totalSeconds = 10 * 60; // 10 minutes in seconds
    const elapsedSeconds = Math.floor(totalSeconds * (timeFilter / 100));
    const remainingSeconds = totalSeconds - elapsedSeconds;
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    const remainingSecs = remainingSeconds % 60;
    setTimeRemaining(`${remainingMinutes}:${remainingSecs.toString().padStart(2, '0')}`);
  }, [timeFilter]);

  // Memoize the filtering function to avoid re-creating it on each render
  const filterMessagesByTime = useCallback((filterTimePercent: number) => {
    const messages = messagesRef.current;
    const discussionStartTime = discussionStartTimeRef.current;
    
    if (!messages || !discussionStartTime) {
      console.log("Cannot filter messages - missing data");
      return messages || [];
    }
  
    // If filter is at 100%, return all messages
    if (filterTimePercent >= 100) {
      return messages;
    }
    
    // Important change: Always use the fixed 10-minute duration for time calculations
    // rather than the calculated discussionDuration from message timestamps
    const TOTAL_DISCUSSION_DURATION = 600 * 1000; // 10 minutes in milliseconds
    
    // Calculate the cutoff time based on the fixed duration
    const filterTimeMs = discussionStartTime.getTime() + 
      (TOTAL_DISCUSSION_DURATION * filterTimePercent / 100);
    
    console.log("Filtering with parameters:", {
      currentFilterPercent: filterTimePercent,
      startTime: discussionStartTime.toISOString(),
      filterTime: new Date(filterTimeMs).toISOString(),
      totalMessages: messages.length
    });
  
    const filtered = messages.filter(msg => {
      try {
        const msgTime = new Date(msg.created_at).getTime();
        
        if (isNaN(msgTime)) {
          console.warn(`Invalid timestamp for message ${msg.id}: ${msg.created_at}`);
          return false;
        }
        
        // Debug code - uncomment if needed
        // if (msgTime > filterTimeMs) {
        //   console.log(`Message ${msg.id} excluded: ${new Date(msg.created_at).toISOString()} > ${new Date(filterTimeMs).toISOString()}`);
        // }
        
        return msgTime <= filterTimeMs;
      } catch (e) {
        console.error(`Error parsing date for message ${msg.id}:`, e);
        return false;
      }
    });
    
    console.log(`Filtering result: ${filtered.length}/${messages.length} messages included`);
    
    // Always return at least some messages if we're past the initial stages
    if (filtered.length === 0 && messages.length > 0 && filterTimePercent > 10) {
      console.warn("Filtering resulted in 0 messages, using initial set instead");
      const sortedMessages = [...messages].sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      return sortedMessages.slice(0, Math.max(1, Math.floor(sortedMessages.length * 0.1)));
    }
    
    return filtered;
  }, []);

  // Calculate active users based on their last_active timestamp and the progress bar
  const calculateActiveUsers = useCallback((currentFilterTime: Date) => {
    const usersData = usersDataRef.current;
    if (!usersData) return { activeCount: 0, participationRate: 0 };

    // Consider a user active if their last_active is within the threshold of the current time
    const activeTimeThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Count users who have been active up to the current filter time
    const participatedUsers = usersData.filter(user => {
      if (!user.last_active) return false;
      
      try {
        const lastActiveTime = new Date(user.last_active).getTime();
        // User has participated if their last activity was before or at current filter time
        return lastActiveTime <= currentFilterTime.getTime();
      } catch (err) {
        console.warn("Error parsing last_active for user:", user.id);
        return false;
      }
    });
    
    // Count users who are currently active (within the threshold)
    const currentlyActiveUsers = usersData.filter(user => {
      if (!user.last_active) return false;
      
      try {
        const lastActiveTime = new Date(user.last_active).getTime();
        const timeDifference = Math.abs(currentFilterTime.getTime() - lastActiveTime);
        return timeDifference <= activeTimeThreshold && lastActiveTime <= currentFilterTime.getTime();
      } catch (err) {
        console.warn("Error parsing last_active for user:", user.id);
        return false;
      }
    }).length;
    
    const calculatedParticipationRate = 
      usersData.length > 0 
      ? Math.round((participatedUsers.length / usersData.length) * 100) 
      : 0;

    return { 
      activeCount: currentlyActiveUsers, 
      participationRate: calculatedParticipationRate
    };
  }, []);

  // The refetch function that can be called from outside
  const refetch = useCallback(async () => {
    if (isRefetching) return; // Prevent multiple refetches simultaneously
    
    setIsRefetching(true);
    console.log("Refetching discussion data...");
    
    try {
      // Fetch discussion data
      const { discussion: discussionData, error: discError } = await getDiscussionById(sessionId);
      if (discError) {
        throw new Error("Failed to fetch discussion data");
      }
      setDiscussion(discussionData);

      // Fetch users
      const { data: userData, error: userError } = await fetchUsersBySession(sessionId);
      if (userError) {
        console.error('Error refetching users:', userError);
      } else if (userData) {
        setUsersData(userData);
        setTotalStudents(userData.length);
        console.log(`Refetched ${userData.length} users`);
      }

      // Fetch messages
      const { data: messagesData, error: messagesError } = await fetchSessionMessages(sessionId);
      if (messagesError) {
        console.error('Error refetching messages:', messagesError);
      } else if (messagesData) {
        console.log(`Refetched ${messagesData.length} messages`);
        
        // Check if we have new messages
        const hasNewMessages = !messages || messagesData.length > messages.length;
        if (hasNewMessages) {
          console.log(`New messages found: ${messagesData.length - (messages?.length || 0)}`);
        }
        
        setMessages(messagesData);
        setTotalMessagesCount(messagesData.length);
        
        // Don't update filtered messages here, it will happen in the effect that
        // responds to messages/timeFilter changes
      }

      // Fetch shared answers
      const { data: answersData, error: answersError } = 
        await fetchSessionSharedAnswers(sessionId);
      if (answersError) {
        console.error('Error refetching shared answers:', answersError);
      } else {
        setSharedAnswers(answersData as SharedAnswersData);
      }

      // Fetch ethical perspectives
      const { data: perspectivesData, error: perspectivesError } = 
        await fetchSessionEthicalPerspectives(sessionId);
      if (perspectivesError) {
        console.error('Error refetching ethical perspectives:', perspectivesError);
      } else {
        setEthicalPerspectives(perspectivesData);
      }
      
      // Fetch common analysis data
      const { data: analysisData, error: commonAnalysisError } = 
        await getCommonAnalysisBySession(sessionId);

      if (commonAnalysisError) {
        console.error('Error refetching common analysis:', commonAnalysisError);
      } else if (analysisData) {
        setCommonAnalysis(analysisData as CommonAnalysisData);
      }
      
      console.log("Refetch of discussion data completed successfully");
    } catch (err) {
      console.error("Error in refetch:", err);
      setError(err instanceof Error ? err : new Error('An unknown error occurred during refetch'));
    } finally {
      setIsRefetching(false);
    }
  }, [sessionId, messages, isRefetching, setTotalMessagesCount]);

  // Fetch all data
  useEffect(() => {
    let isMounted = true;
    
    const fetchAllData = async () => {
      try {
        // Fetch discussion data
        const { discussion: discussionData, error: discError } = await getDiscussionById(sessionId);
        if (discError) {
          throw new Error("Failed to fetch discussion data");
        }
        if (isMounted) setDiscussion(discussionData);

        // Fetch users
        const { data: userData, error: userError } = await fetchUsersBySession(sessionId);
        if (userError) {
          console.error('Error fetching users:', userError);
        } else if (userData && isMounted) {
          setUsersData(userData);
          setTotalStudents(userData.length);
          console.log(`Fetched ${userData.length} users`);
        }

        // Fetch messages
        const { data: messagesData, error: messagesError } = await fetchSessionMessages(sessionId);
        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
        } else if (messagesData && isMounted) {
          console.log(`Fetched ${messagesData.length} messages`);
          
          // Check if there are actually messages in the data
          if (messagesData.length === 0) {
            console.warn("No messages returned from API for session:", sessionId);
          }
          
          setMessages(messagesData);
          
          // Initially, don't filter - show all messages
          setFilteredMessages(messagesData);
          setTotalMessagesCount(messagesData.length);
          setFilteredMessagesCount(messagesData.length);
          
          // Get unique group IDs and ensure they're not undefined
          const uniqueGroupIds = [...new Set(messagesData
            .map(msg => msg.group_id)
            .filter((id): id is string => id !== undefined)
          )];

          console.log(`Found ${uniqueGroupIds.length} unique groups in messages`);

          // Fetch group numbers
          const groupMappingResults = await Promise.all(
            uniqueGroupIds.map(async (groupId) => {
              const { group } = await getGroupById(groupId);
              if (group && group.number) {
                return { groupId, number: group.number };
              }
              return null;
            })
          );

          // Create the mapping, filtering out any null results
          const mapping = groupMappingResults.reduce((acc, result) => {
            if (result) {
              acc[result.groupId] = result.number;
            }
            return acc;
          }, {} as Record<string, number>);
          
          if (isMounted) setGroupMapping(mapping);

          // Calculate discussion start time and duration
          if (messagesData.length > 0) {
            const parsedDates = messagesData.map(msg => {
              try {
                const date = new Date(msg.created_at);
                return {
                  id: msg.id,
                  date: date,
                  timestamp: date.getTime(),
                  isValid: !isNaN(date.getTime())
                };
              } catch (e) {
                console.error(`Error parsing date for message ${msg.id}:`, e);
                return null;
              }
            }).filter(item => item && item.isValid);
            
            // Verify we have valid parsed dates
            if (parsedDates.length === 0) {
              console.error("No valid dates could be parsed from messages");
              // Create a fallback date range (10 minutes from now)
              const now = new Date();
              
              if (isMounted) {
                setDiscussionStartTime(now);
                setDiscussionDuration(10 * 60 * 1000); // 10 minutes in milliseconds
              }
            } else {
              // Sort by timestamp
              parsedDates.sort((a, b) => a!.timestamp - b!.timestamp);
              
              const firstMessageTime = parsedDates[0]!.date;
              const lastMessageTime = parsedDates[parsedDates.length - 1]!.date;
              
              // Make sure the duration is at least 1 minute
              const calculatedDuration = Math.max(
                lastMessageTime.getTime() - firstMessageTime.getTime(),
                60 * 1000 // 1 minute minimum
              );
              
              if (isMounted) {
                setDiscussionStartTime(firstMessageTime);
                setDiscussionDuration(calculatedDuration);
              }
            }
          }
        }

        // Fetch shared answers
        const { data: answersData, error: answersError } = 
          await fetchSessionSharedAnswers(sessionId);
        if (answersError) {
          console.error('Error fetching shared answers:', answersError);
        } else if (isMounted) {
          setSharedAnswers(answersData as SharedAnswersData);
        }

        // Fetch ethical perspectives
        const { data: perspectivesData, error: perspectivesError } = 
          await fetchSessionEthicalPerspectives(sessionId);
        if (perspectivesError) {
          console.error('Error fetching ethical perspectives:', perspectivesError);
        } else if (isMounted) {
          setEthicalPerspectives(perspectivesData);
        }
        
        // Fetch common analysis data
        const { data: analysisData, error: commonAnalysisError } = 
          await getCommonAnalysisBySession(sessionId);

        if (commonAnalysisError) {
          console.error('Error fetching common analysis:', commonAnalysisError);
        } else if (analysisData && isMounted) {
          setCommonAnalysis(analysisData as CommonAnalysisData);
        }

      } catch (err) {
        console.error("Error in fetchAllData:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('An unknown error occurred'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAllData();
    
    // Cleanup function to prevent state updates if the component unmounts
    return () => {
      isMounted = false;
    };
  }, [sessionId, setFilteredMessagesCount, setTotalMessagesCount, calculateActiveUsers]);

  // Filter messages and calculate active users based on time slider
  useEffect(() => {
    // If messages exist, filter them
    if (messages && messages.length > 0) {
      try {
        const filtered = filterMessagesByTime(timeFilter);
        
        if (filtered && filtered.length > 0) {
          setFilteredMessages(filtered);
          setFilteredMessagesCount(filtered.length);
        } else if (timeFilter < 5) {
          // If we're at the beginning of the timeline and have no messages,
          // just show nothing (normal state at start)
          setFilteredMessages([]);
          setFilteredMessagesCount(0);
        } else {
          // If filtering results in no messages but we're somewhere in the timeline,
          // keep showing some messages
          const initialMessages = messages.slice(0, Math.max(1, Math.floor(messages.length * 0.2)));
          setFilteredMessages(initialMessages);
          setFilteredMessagesCount(initialMessages.length);
        }
      } catch (err) {
        console.error("Error filtering messages:", err);
        // Fall back to showing all messages in case of error
        setFilteredMessages(messages);
        setFilteredMessagesCount(messages.length);
      }
    }

    // Update time display - start from 0:00 instead of counting from discussion start
    const elapsedSeconds = Math.floor(600 * timeFilter / 100); // 10 minutes = 600 seconds
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    setCurrentTimeDisplay(timeDisplay);
    
    // Update active users based on the current filter time
    if (discussionStartTime && discussionDuration > 0 && usersData) {
      const currentFilterTime = new Date(
        discussionStartTime.getTime() + (discussionDuration * timeFilter / 100)
      );
      
      const { activeCount, participationRate: calculatedParticipationRate } = 
        calculateActiveUsers(currentFilterTime);
      
      setActiveStudents(activeCount);
      setParticipationRate(calculatedParticipationRate);
      
      console.log(`Active metrics at ${timeFilter}%:`, {
        currentTime: currentFilterTime.toISOString(),
        activeUsers: activeCount,
        totalUsers: usersData.length,
        participationRate: `${calculatedParticipationRate}%`
      });
    } else if (timeFilter <= 40) {
      // Fallback behavior if user data isn't available yet
      const newActiveStudents = Math.floor(54 + (6 * timeFilter / 40));
      setActiveStudents(newActiveStudents);
    } else {
      // After 40%, keep at 60 students
      setActiveStudents(60);
    }
  }, [timeFilter, filterMessagesByTime, setCurrentTimeDisplay, setFilteredMessagesCount, messages, discussionStartTime, discussionDuration, usersData, calculateActiveUsers]);

  return {
    discussion,
    loading,
    error,
    messages,
    filteredMessages,
    sharedAnswers,
    ethicalPerspectives,
    commonAnalysis,
    groupMapping,
    discussionStartTime,
    discussionDuration,
    activeStudents,
    totalStudents,
    participationRate,
    timeRemaining,
    refetch,
    isRefetching
  };
}