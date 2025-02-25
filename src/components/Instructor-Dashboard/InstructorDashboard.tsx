"use client";

import React, { useEffect, useState, useRef} from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, MessageCircle } from 'lucide-react';
import { 
    LineChart, 
    Line, 
    BarChart,
    Bar,
    Cell,
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    PieChart,
    Pie
} from 'recharts';

import { getDiscussionById } from "@/lib/actions/discussion";
import { fetchSessionMessages } from "@/lib/actions/message";
import { fetchSessionSharedAnswers } from "@/lib/actions/shared-answers";
import { fetchSessionEthicalPerspectives } from "@/lib/actions/ethical-perspectives";
import { getGroupById } from "@/lib/actions/group";
import { MonitorClientProps, Discussion, Message } from "@/types";
import { 
    generateChartData, 
    initialGroupAnswerData, 
    initialEthicalPerspectiveData, 
    initialParticipationData, 
    COLORS 
} from '@/lib/data/chartData';
import { useTimeFilter } from './InstructorDashboardWrapper';

import { EthicalPerspective, PerspectiveEntry, SharedAnswers } from "@/types"

interface GroupAnswerData {
    answer: string;
    frequency: number;
}
  
interface EthicalPerspectiveData {
    name: string;
    value: number;
}
  
interface ParticipationData {
    time: string;
    rate: number;
}
  
interface ChartData {
    groupAnswerData: GroupAnswerData[];
    ethicalPerspectiveData: EthicalPerspectiveData[];
    participationData: ParticipationData[];
    currentDiscussionPoint: number;
}
  
interface PerspectivesData {
    [key: number]: PerspectiveEntry[];
}
  
interface SharedAnswersData {
    [key: string]: SharedAnswers;
  }

function InstructorDashboard({ sessionId }: MonitorClientProps) {    
    const {
        timeFilter,
        setCurrentTimeDisplay,
        setFilteredMessagesCount,
        setTotalMessagesCount
    } = useTimeFilter();

    const [discussion, setDiscussion] = useState<Discussion | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<string>('10:00');
    const [messages, setMessages] = useState<Message[] | null>(null);
    const [filteredMessages, setFilteredMessages] = useState<Message[] | null>(null);
    const [sharedAnswers, setSharedAnswers] = useState<SharedAnswersData | null>(null);
    const [ethicalPerspectives, setEthicalPerspectives] = useState<PerspectivesData | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [groupMapping, setGroupMapping] = useState<Record<string, number>>({});
    const [discussionStartTime, setDiscussionStartTime] = useState<Date | null>(null);
    const [discussionDuration, setDiscussionDuration] = useState<number>(0); // in milliseconds
    const [activeStudents, setActiveStudents] = useState<number>(54); // Start at 54 students
    const [currentChartData, setCurrentChartData] = useState<ChartData>({
        groupAnswerData: initialGroupAnswerData,
        ethicalPerspectiveData: initialEthicalPerspectiveData,
        participationData: initialParticipationData,
        currentDiscussionPoint: 0
    });
    const messageEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [chartDataHistory, setChartDataHistory] = useState<ChartData[]>([]);

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

    // Update chart data based on progress bar position
    useEffect(() => {
        const newChartData = generateChartData(timeFilter);
        // Freeze the previous discussion point's data when moving forward
        if (newChartData.currentDiscussionPoint > chartDataHistory.length) {
            setChartDataHistory(prevHistory => [...prevHistory, currentChartData]);
        }
        setCurrentChartData(newChartData);
    }, [timeFilter, chartDataHistory.length, currentChartData]);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // Fetch discussion data
                const { discussion: discussionData, error: discError } = await getDiscussionById(sessionId);
                if (discError) {
                    throw new Error("Failed to fetch discussion data");
                }
                setDiscussion(discussionData);

                // Fetch messages
                const { data: messagesData, error: messagesError } = await fetchSessionMessages(sessionId);
                if (messagesError) {
                    console.error('Error fetching messages:', messagesError);
                } else if (messagesData) {
                    setMessages(messagesData);
                    setFilteredMessages(messagesData);
                    setTotalMessagesCount(messagesData.length);
                    setFilteredMessagesCount(messagesData.length);
                    
                    // Get unique group IDs and ensure they're not undefined
                    const uniqueGroupIds = [...new Set(messagesData
                        .map(msg => msg.group_id)
                        .filter((id): id is string => id !== undefined)
                    )];

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
                    
                    setGroupMapping(mapping);

                    // Calculate discussion start time and duration
                    if (messagesData.length > 0) {
                        const sortedMessages = [...messagesData].sort((a, b) => 
                            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        );
                        const firstMessageTime = new Date(sortedMessages[0].created_at);
                        const lastMessageTime = new Date(sortedMessages[sortedMessages.length - 1].created_at);
                        setDiscussionStartTime(firstMessageTime);
                        setDiscussionDuration(lastMessageTime.getTime() - firstMessageTime.getTime());
                    }

                    console.log('Session Messages:', {
                        totalMessages: messagesData.length,
                        messagesByGroup: messagesData.reduce((acc: Record<string, number>, msg: Message) => {
                            const groupId = msg.group_id || 'unassigned'; 
                            acc[groupId] = (acc[groupId] || 0) + 1;
                            return acc;
                        }, {}),
                        timeRange: messagesData.length ? {
                            first: new Date(messagesData[0].created_at),
                            last: new Date(messagesData[messagesData.length - 1].created_at)
                        } : null
                    });
                }

                // Fetch shared answers
                const { data: answersData, rawData: rawAnswers, error: answersError } = 
                    await fetchSessionSharedAnswers(sessionId);
                if (answersError) {
                    console.error('Error fetching shared answers:', answersError);
                } else {
                    setSharedAnswers(answersData as SharedAnswersData);
                    console.log('Shared Answers:', {
                        answersByGroup: Object.keys(answersData || {}).length,
                        rawAnswers: rawAnswers?.length,
                        sampleFormat: answersData ? Object.keys(answersData) : null
                    });
                }

                // Fetch ethical perspectives
                const { data: perspectivesData, rawData: rawPerspectives, error: perspectivesError } = 
                    await fetchSessionEthicalPerspectives(sessionId);
                if (perspectivesError) {
                    console.error('Error fetching ethical perspectives:', perspectivesError);
                } else {
                    setEthicalPerspectives(perspectivesData);
                    console.log('Ethical Perspectives:', {
                        byPoint: perspectivesData ? Object.keys(perspectivesData).map(pointKey => {
                            const point = parseInt(pointKey);
                            return {
                                point,
                                perspectiveCount: perspectivesData[point].length,
                                frameworks: perspectivesData[point].reduce((acc: Record<string, number>, p: PerspectiveEntry) => {
                                    p.perspectives.forEach((persp: EthicalPerspective) => {
                                        acc[persp.framework] = (acc[persp.framework] || 0) + 1;
                                    });
                                    return acc;
                                }, {})
                            };
                        }) : null,
                        totalPerspectives: rawPerspectives?.length
                    });
                }

            } catch (err) {
                setError(err instanceof Error ? err : new Error('An unknown error occurred'));
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [sessionId, setFilteredMessagesCount, setTotalMessagesCount]);

    // Filter messages based on time slider
    useEffect(() => {
        if (!messages || !discussionStartTime || discussionDuration === 0) return;

        const filterTime = discussionStartTime.getTime() + (discussionDuration * timeFilter / 100);
        
        const filtered = messages.filter(msg => {
            const msgTime = new Date(msg.created_at).getTime();
            return msgTime <= filterTime;
        });

        setFilteredMessages(filtered);
        setFilteredMessagesCount(filtered.length);

        // Update time display - start from 0:00 instead of counting from discussion start
        const elapsedSeconds = Math.floor(600 * timeFilter / 100); // 10 minutes = 600 seconds
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        setCurrentTimeDisplay(timeDisplay);

        // Update active students count - increase from 54 to 60 over the first 40% of the timeline
        if (timeFilter <= 40) {
            // Linear interpolation: 54 to 60 from 0% to 40%
            const newActiveStudents = Math.floor(54 + (6 * timeFilter / 40));
            setActiveStudents(newActiveStudents);
        } else {
            // After 40%, keep at 60 students
            setActiveStudents(60);
        }

    }, [timeFilter, messages, discussionStartTime, discussionDuration, setCurrentTimeDisplay, setFilteredMessagesCount]);

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const groupedMessages = filteredMessages?.reduce<Record<string, Message[]>>((acc, msg) => {
        const groupId = msg.group_id || 'unassigned';  
        if (!acc[groupId]) {
            acc[groupId] = [];
        }
        acc[groupId].push(msg);
        return acc;
    }, {}) || {};

    const renderAnalytics = () => {
        // Generate chart data for each question point
        const questionChartData = discussion?.discussion_points?.map((_, index) => {
            if (index < chartDataHistory.length) {
                // For completed questions, use the frozen data
                return chartDataHistory[index];
            } else if (index === chartDataHistory.length) {
                // Current question - show current data
                return currentChartData;
            } else {
                // Future questions - show minimal data
                const minimalData = generateChartData(index * 30);
                return {
                    groupAnswerData: minimalData.groupAnswerData,
                    ethicalPerspectiveData: minimalData.ethicalPerspectiveData,
                    participationData: minimalData.participationData,
                    currentDiscussionPoint: index
                };
            }
        });

        return (
            <>
                {discussion?.discussion_points && discussion.discussion_points.length > 0 ? (
                    <>
                       

                        {/* All Discussion Points Stacked */}
                        {discussion.discussion_points.map((point, index) => (
                            <div key={index} className={`mb-8 p-4 border rounded-lg ${currentChartData.currentDiscussionPoint === index ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                                <div className="mb-4">
                                    <div className="flex items-start space-x-4 mb-2">
                                        <h2 className="text-xl font-bold whitespace-nowrap">Question {index + 1}:</h2>
                                        <p className="text-xl text-gray-700">{point.content}</p>
                                    </div>
                                    <Separator className="my-4" />
                                </div>

                                <div className="flex space-x-6">
                                    {/* Group Answer Frequencies */}
                                    <Card className="flex-1">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-medium">Group Answer</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart 
                                                        data={questionChartData?.[index]?.groupAnswerData || []} 
                                                        layout="vertical"
                                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis type="number" />
                                                        <YAxis 
                                                            type="category" 
                                                            dataKey="answer" 
                                                            width={150}
                                                            tick={{ fontSize: 12 }}
                                                        />
                                                        <Tooltip 
                                                            contentStyle={{ fontSize: 12 }}
                                                            formatter={(value) => [`${value} groups`, 'Frequency']}
                                                        />
                                                        <Bar 
                                                            dataKey="frequency" 
                                                            fill={index === currentChartData.currentDiscussionPoint ? "#2563eb" : "#94a3b8"}
                                                            label={{ position: 'right', fontSize: 12 }}
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Ethical Perspectives Distribution */}
                                    <Card className="flex-1">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-medium">Ethical Perspectives</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={questionChartData?.[index]?.ethicalPerspectiveData || []}
                                                            cx="50%"
                                                            cy="50%"
                                                            labelLine={false}
                                                            label={({ name}) => `${name}`}
                                                            outerRadius={80}
                                                            innerRadius={40}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                        >
                                                            {(questionChartData?.[index]?.ethicalPerspectiveData || []).map((entry, i) => (
                                                                <Cell 
                                                                    key={`cell-${i}`} 
                                                                    fill={index === currentChartData.currentDiscussionPoint ? 
                                                                        COLORS[i % COLORS.length] : 
                                                                        `${COLORS[i % COLORS.length]}99`} // Add transparency to inactive
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Participation Rate */}
                                    <Card className="flex-1">
                                        <CardHeader>
                                            <CardTitle className="text-sm font-medium">Participation Rate</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={questionChartData?.[index]?.participationData || []}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="time" />
                                                        <YAxis domain={[0, 100]} />
                                                        <Tooltip />
                                                        <Line 
                                                            type="monotone" 
                                                            dataKey="rate" 
                                                            stroke={index === currentChartData.currentDiscussionPoint ? "#9333ea" : "#94a3b8"}
                                                            strokeWidth={2}
                                                            name="Participation %"
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        ))}
                    </>
                ) : <div>No discussion points available</div>}
            </>
        );
    };

    // Use messageEndRef in a function to avoid the "unused variable" warning
    const scrollToBottom = () => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [selectedGroup, filteredMessages]);

    const renderGroupMessages = () => (
        <div className="grid grid-cols-12 gap-6">
            {/* Left Side - Group List */}
            <div className="col-span-4 space-y-4">
                {Object.entries(groupedMessages).map(([groupId, msgs]: [string, Message[]]) => (
                    <Card 
                        key={groupId}
                        className={`cursor-pointer transition-all ${
                            selectedGroup === groupId ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedGroup(selectedGroup === groupId ? null : groupId)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <MessageCircle 
                                    className={`h-5 w-5 ${
                                        selectedGroup === groupId ? 'text-blue-500' : 'text-gray-500'
                                    }`} 
                                />
                                <div>
                                    <h3 className="font-semibold">
                                        Group {groupMapping[groupId] || '...'}
                                    </h3>
                                    <p className="text-sm text-gray-500">{msgs.length} messages</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Right Side - Message Display */}
            <div className="col-span-8">
            {selectedGroup ? (
                <Card className="h-[calc(100vh-200px)] flex flex-col">
                    <CardHeader className="border-b">
                        <CardTitle className="text-lg font-semibold">
                            Group {groupMapping[selectedGroup]} Messages
                        </CardTitle>
                    </CardHeader>
                    <CardContent 
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4"
                        style={{ 
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#CBD5E1 transparent'
                        }}
                    >
                        {groupedMessages[selectedGroup]?.map((msg: Message) => (
                            <div 
                                key={msg.id} 
                                className="p-4 rounded-lg bg-gray-50 border border-gray-100"
                            >
                                <div className="flex justify-between items-start">
                                    <span className="font-medium">{msg.username}</span>
                                    <span className="text-sm text-gray-500">
                                        {formatTime(msg.created_at)}
                                    </span>
                                </div>
                                <p className="mt-2 text-gray-700">{msg.content}</p>
                            </div>
                        ))}
                        <div ref={messageEndRef} />
                    </CardContent>
                </Card>
            ) : (
                <div className="h-[calc(100vh-200px)] flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a group to view messages</p>
                    </div>
                </div>
            )}
            </div>
        </div>
    );

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500">Error loading discussion data</div>;
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
            <div className="flex space-x-6">
                <Card className="flex-1">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Active Groups</p>
                                <h3 className="text-2xl font-bold">5</h3>
                            </div>
                            <Users className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex-1">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Active Students</p>
                                <h3 className="text-2xl font-bold">{activeStudents}</h3>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex-1">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Time Remaining</p>
                                <h3 className="text-2xl font-bold">{timeRemaining}</h3>
                            </div>
                            <Clock className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                
            </div>

            {/* Tabs */}
            <Tabs defaultValue="analysis" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="analysis">Analysis</TabsTrigger>
                    <TabsTrigger value="messages">Group Messages</TabsTrigger>
                </TabsList>

                <TabsContent value="analysis" className="space-y-8">
                    {renderAnalytics()}
                </TabsContent>

                <TabsContent value="messages">
                    <div className="pb-16">
                        {renderGroupMessages()}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default InstructorDashboard;