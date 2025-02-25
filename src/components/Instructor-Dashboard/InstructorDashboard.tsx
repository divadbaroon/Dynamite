"use client";

import React, { useState, useMemo, useEffect } from 'react';
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

function InstructorDashboard({ sessionId }: MonitorClientProps) {
    const {
        timeFilter,
        setCurrentTimeDisplay,
        setFilteredMessagesCount,
        setTotalMessagesCount
    } = useTimeFilter();

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
        timeRemaining
    } = useDiscussionData({
        sessionId,
        timeFilter,
        setCurrentTimeDisplay,
        setFilteredMessagesCount,
        setTotalMessagesCount
    });

    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [groupsData, setGroupsData] = useState<any[] | null>(null);
    const [usersData, setUsersData] = useState<any[] | null>(null);
    const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(true);
    const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
    const [activeUsers, setActiveUsers] = useState<number>(0);
    const [totalUsers, setTotalUsers] = useState<number>(0);
    const [participationRate, setParticipationRate] = useState<number>(0);

    // Fetch groups data when the component mounts
    useEffect(() => {
        async function getGroups() {
            setIsLoadingGroups(true);
            try {
                const { data, error } = await fetchGroupsBySession(sessionId);
                
                if (error) {
                    console.error("Error fetching groups:", error);
                    return;
                }
                
                if (data) {
                    setGroupsData(data);
                    console.log("GROUPS DATA:", data);
                    console.log("GROUPS COUNT:", data.length);
                }
            } catch (err) {
                console.error("Exception during groups fetch:", err);
            } finally {
                setIsLoadingGroups(false);
            }
        }
        
        getGroups();
    }, [sessionId]);

    // Fetch users data when the component mounts
    useEffect(() => {
        async function getUsers() {
            setIsLoadingUsers(true);
            try {
                const { data, error } = await fetchUsersBySession(sessionId);

                console.log("USERS", data)
                
                if (error) {
                    console.error("Error fetching users:", error);
                    return;
                }
                
                if (data) {
                    setUsersData(data);
                    setTotalUsers(data.length);
                    console.log("USERS DATA:", data);
                    console.log("USERS COUNT:", data.length);
                }
            } catch (err) {
                console.error("Exception during users fetch:", err);
            } finally {
                setIsLoadingUsers(false);
            }
        }
        
        getUsers();
    }, [sessionId]);

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

    if (loading) {
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
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Discussion Monitor</h1>
                <p className="text-gray-500">{discussion.title}</p>
                <Separator className="my-4" />
            </div>

            {/* Top Metrics */}
            <DashboardHeader 
                activeGroups={totalGroupsCount || activeGroupsCount}
                activeStudents={activeUsers}
                totalStudents={totalUsers}
                participationRate={participationRate}
                timeRemaining={timeRemaining}
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