import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { MonitorClientProps, Message } from "@/types";

import DashboardHeader from './DashboardHeader';
import AnalyticsTab from './AnalyticsTab';
import MessagesTab from './MessagesTab';
import { useDiscussionData } from '@/lib/hooks/instructor-dashboard/useDiscussionData';
import { useTimeFilter } from './InstructorDashboardWrapper';
import { fetchGroupsBySession } from '@/lib/actions/groups';
import { fetchUsersBySession } from '@/lib/actions/user'; 

// Add the updateTimeRemaining prop to the interface
interface InstructorDashboardProps extends MonitorClientProps {
    updateTimeRemaining?: (discussion: any) => void;
}

function InstructorDashboard({ sessionId, updateTimeRemaining }: InstructorDashboardProps) {
    const {
        timeFilter,
        setCurrentTimeDisplay,
        setFilteredMessagesCount,
        setTotalMessagesCount,
        timeRemaining: contextTimeRemaining, // Get the timeRemaining directly from context
        formatTime // Get the formatTime function from context
    } = useTimeFilter();

    // Format the time remaining using the context's formatter
    const formattedTimeRemaining = formatTime(contextTimeRemaining);

    // Create a state to track formatted time for the header
    const [headerTimeDisplay, setHeaderTimeDisplay] = useState(formattedTimeRemaining);

    // Update the header time display whenever contextTimeRemaining changes
    useEffect(() => {
        setHeaderTimeDisplay(formatTime(contextTimeRemaining));
    }, [contextTimeRemaining, formatTime]);

    // Track if an initial load has happened
    const isInitialLoadRef = useRef(true);
    // Track if a refetch is in progress to prevent overlapping fetches
    const isRefetchingRef = useRef(false);
    // Last refetch timestamp
    const lastRefetchTimeRef = useRef(Date.now());

    const {
        discussion,
        loading,
        error,
        messages,
        filteredMessages,
        discussionStartTime,
        discussionDuration,
        sharedAnswers,
        ethicalPerspectives,
        commonAnalysis,
        groupMapping,
        activeStudents: hookActiveStudents,
        timeRemaining, // This is from useDiscussionData, not using this for display
        refetch: refetchDiscussionData
    } = useDiscussionData({
        sessionId,
        timeFilter,
        setCurrentTimeDisplay,
        setFilteredMessagesCount,
        setTotalMessagesCount
    });

    // Store updateTimeRemaining in a ref to break the dependency cycle
    const updateTimeRemainingRef = useRef(updateTimeRemaining);
    
    // Update the ref when the prop changes
    useEffect(() => {
        updateTimeRemainingRef.current = updateTimeRemaining;
    }, [updateTimeRemaining]);
    
    // Store previous discussion launch time to detect changes
    const prevLaunchTimeRef = useRef<string | null>(null);
    const prevDiscussionIdRef = useRef<string | null>(null);
    
    // Call updateTimeRemaining when discussion launch time changes
    useEffect(() => {
        if (!discussion) return;
        
        const currentLaunchTime = discussion.has_launched || null;
        const currentId = discussion.id || null;
        
        // Only update if the launch time or ID has changed
        if (currentLaunchTime && 
            (currentLaunchTime !== prevLaunchTimeRef.current || 
             currentId !== prevDiscussionIdRef.current)) {
            
            prevLaunchTimeRef.current = currentLaunchTime;
            prevDiscussionIdRef.current = currentId;
            
            if (updateTimeRemainingRef.current) {
                updateTimeRemainingRef.current(discussion);
            }
        }
    }, [discussion]);

    // Keep the rest of your component as is...
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [groupsData, setGroupsData] = useState<any[] | null>(null);
    const [usersData, setUsersData] = useState<any[] | null>(null);
    const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(true);
    const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
    const [activeUsers, setActiveUsers] = useState<number>(0);
    const [totalUsers, setTotalUsers] = useState<number>(0);
    const [participationRate, setParticipationRate] = useState<number>(0);

    // Function to fetch groups data
    const fetchGroups = useCallback(async () => {
        // Existing fetchGroups implementation...
        try {
            if (!isInitialLoadRef.current) {
                // Don't show loading indicator for refetches to avoid UI flicker
                setIsLoadingGroups(false);
            }
            
            const { data, error } = await fetchGroupsBySession(sessionId);
            
            if (error) {
                console.error("Error fetching groups:", error);
                return;
            }
            
            if (data) {
                setGroupsData(data);
                if (isInitialLoadRef.current) {
                    console.log("Initial GROUPS DATA:", data);
                    console.log("GROUPS COUNT:", data.length);
                } else {
                    console.log("Refetched groups data, count:", data.length);
                }
            }
        } catch (err) {
            console.error("Exception during groups fetch:", err);
        } finally {
            setIsLoadingGroups(false);
            isInitialLoadRef.current = false;
        }
    }, [sessionId]);

    // Function to fetch users data
    const fetchUsers = useCallback(async () => {
        // Existing fetchUsers implementation...
        try {
            if (!isInitialLoadRef.current) {
                // Don't show loading indicator for refetches to avoid UI flicker
                setIsLoadingUsers(false);
            }
            
            const { data, error } = await fetchUsersBySession(sessionId);
            
            if (error) {
                console.error("Error fetching users:", error);
                return;
            }
            
            if (data) {
                setUsersData(data);
                setTotalUsers(data.length);
                if (isInitialLoadRef.current) {
                    console.log("Initial USERS DATA:", data);
                    console.log("USERS COUNT:", data.length);
                } else {
                    console.log("Refetched users data, count:", data.length);
                }
            }
        } catch (err) {
            console.error("Exception during users fetch:", err);
        } finally {
            setIsLoadingUsers(false);
            isInitialLoadRef.current = false;
        }
    }, [sessionId]);

    // Function to refetch all data
    const refetchAllData = useCallback(async () => {
        // Existing refetchAllData implementation...
        // Prevent multiple concurrent refetches
        if (isRefetchingRef.current) return;
        
        const now = Date.now();
        // Only refetch at most once every 5 seconds (throttle)
        if (now - lastRefetchTimeRef.current < 5000) return;
        
        isRefetchingRef.current = true;
        lastRefetchTimeRef.current = now;
        
        try {
            console.log("Refetching all data...");
            
            // Fetch all data in parallel for efficiency
            await Promise.all([
                fetchGroups(),
                fetchUsers(),
                refetchDiscussionData?.() // Use optional chaining in case refetch isn't available
            ]);
            
            console.log("Data refetch complete");
        } catch (err) {
            console.error("Error during data refetch:", err);
        } finally {
            isRefetchingRef.current = false;
        }
    }, [fetchGroups, fetchUsers, refetchDiscussionData]);

    // The rest of your existing effects...
    // Initial data fetch
    useEffect(() => {
        fetchGroups();
        fetchUsers();
    }, [fetchGroups, fetchUsers]);
    
    // Setup the auto-refetch interval (every 15 seconds)
    useEffect(() => {
        const intervalId = setInterval(() => {
            refetchAllData();
        }, 15000); // 15 seconds
        
        return () => clearInterval(intervalId);
    }, [refetchAllData]);

    // Calculate active users and participation rate based on their last_active timestamp
    useEffect(() => {
        if (!usersData || !discussionStartTime || discussionDuration === 0) {
            return;
        }

        try {
            // Calculate the current time based on the progress bar
            const currentFilterTime = new Date(
                discussionStartTime.getTime() + (discussionDuration * timeFilter / 100)
            );
            
            // Consider a user active if their last_active is within the threshold of the current time
            const activeTimeThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
            
            // Track participation through the session
            const totalParticipatedUsers = usersData.filter(user => 
                user.last_active !== null && user.last_active !== undefined
            ).length;
            
            // Users active at the current filter time
            const currentlyActiveUsers = usersData.filter(user => {
                if (!user.last_active) return false;
                
                try {
                    const lastActiveTime = new Date(user.last_active).getTime();
                    const timeDifference = Math.abs(currentFilterTime.getTime() - lastActiveTime);
                    return timeDifference <= activeTimeThreshold;
                } catch (err) {
                    console.warn("Error parsing last_active for user:", user.id);
                    return false;
                }
            }).length;
            
            // Track participation metrics
            setActiveUsers(currentlyActiveUsers);
            setParticipationRate(
                totalParticipatedUsers > 0 
                    ? Math.round((totalParticipatedUsers / totalUsers) * 100) 
                    : 0
            );
            
            console.log(`Active metrics:`, {
                currentFilterTime: currentFilterTime.toISOString(),
                totalUsers: totalUsers,
                totalParticipated: totalParticipatedUsers,
                currentlyActive: currentlyActiveUsers,
                participationRate: `${(totalParticipatedUsers / totalUsers) * 100}%`
            });
        } catch (err) {
            console.error("Error calculating active users:", err);
            // Fallback to the hook value if there's an error
            setActiveUsers(hookActiveStudents);
        }
    }, [usersData, timeFilter, discussionStartTime, discussionDuration, hookActiveStudents, totalUsers]);

    // Calculate active groups count using useMemo to avoid recalculations
    const activeGroupsCount = useMemo(() => {
        if (!filteredMessages) return 0;
        
        const uniqueGroups: Record<string, boolean> = {};
        filteredMessages.forEach((msg: Message) => {
            if (msg.group_id) uniqueGroups[msg.group_id] = true;
        });
        
        return Object.keys(uniqueGroups).length;
    }, [filteredMessages]);
    
    // Get total groups count from our direct query
    const totalGroupsCount = groupsData?.length || 0;
    
    // Create grouped messages object using useMemo
    const groupedMessages = useMemo(() => {
        if (!filteredMessages) return {};
        
        return filteredMessages.reduce<Record<string, Message[]>>(
            (acc: Record<string, Message[]>, msg: Message) => {
                const groupId = msg.group_id || 'unassigned';  
                if (!acc[groupId]) {
                    acc[groupId] = [];
                }
                acc[groupId].push(msg);
                return acc;
            }, 
            {}
        );
    }, [filteredMessages]);

    // Add a manual refresh button handler
    const handleManualRefresh = () => {
        refetchAllData();
    };

    if (loading && isInitialLoadRef.current) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500">Error loading discussion data: {error.message}</div>;
    }

    if (!discussion) {
        return <div className="text-red-500">No discussion data available</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* Page Header */}
            <div className="space-y-2 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">Discussion Monitor</h1>
                    <p className="text-gray-500">{discussion.title}</p>
                </div>
                <button 
                    onClick={handleManualRefresh}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    disabled={isRefetchingRef.current}
                >
                    {isRefetchingRef.current ? 'Refreshing...' : 'Refresh Data'}
                </button>
            </div>
            <Separator className="my-4" />

            {/* Top Metrics - Now using the formatted time from context */}
            <DashboardHeader 
                activeGroups={totalGroupsCount || activeGroupsCount}
                activeStudents={activeUsers}
                totalStudents={totalUsers}
                participationRate={participationRate}
                timeRemaining={headerTimeDisplay} // Use our formatted time from context
            />

            {/* Tabs */}
            <Tabs defaultValue="analysis" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="analysis">Analysis</TabsTrigger>
                    <TabsTrigger value="messages">Group Messages</TabsTrigger>
                </TabsList>

                <TabsContent value="analysis" className="space-y-8">
                    <AnalyticsTab 
                        discussion={discussion}
                        timeFilter={timeFilter}
                        sharedAnswers={sharedAnswers}
                        ethicalPerspectives={ethicalPerspectives}
                        commonAnalysis={commonAnalysis}
                    />
                </TabsContent>

                <TabsContent value="messages">
                    <div className="pb-16">
                        <MessagesTab 
                            groupedMessages={groupedMessages}
                            groupMapping={groupMapping}
                            selectedGroup={selectedGroup}
                            setSelectedGroup={setSelectedGroup}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default InstructorDashboard;