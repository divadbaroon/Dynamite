"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, Users } from 'lucide-react';
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
} from 'recharts';

import { getDiscussionById } from "@/lib/actions/discussion"
import { MonitorClientProps, Discussion } from "@/types"
import { COLORS, groupAnswerData, ethicalPerspectiveData, participationData } from "@/lib/data/chartData"

function InstructorDashboard({ sessionId }: MonitorClientProps) {    
    const [discussion, setDiscussion] = useState<Discussion | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    useEffect(() => {
        const fetchDiscussion = async () => {
            try {
                const { discussion: discussionData, error: discError } = await getDiscussionById(sessionId);
                if (discError) {
                    const error = new Error("Failed to fetch discussion data");
                    setError(error);
                    console.log("Failed to fetch discussion data");
                    return;
                }
                setDiscussion(discussionData);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('An unknown error occurred'));
            } finally {
                setLoading(false);
            }
        };

        fetchDiscussion();
    }, [sessionId]);

    useEffect(() => {
        if (!discussion || !discussion.has_launched) {
            setTimeRemaining('--:--');
            return;
        }

        const updateTimeRemaining = () => {
            try {
                const launchTime = new Date(discussion.has_launched as string).getTime();
                const currentTime = new Date().getTime();
                const elapsedSeconds = Math.floor((currentTime - launchTime) / 1000);
                const remainingSeconds = Math.max(0, discussion.time_left - elapsedSeconds);
                
                const minutes = Math.floor(remainingSeconds / 60);
                const seconds = remainingSeconds % 60;
                setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            } catch (error) {
                console.error('Error calculating time remaining:', error);
                setTimeRemaining('--:--');
            }
        };

        const timer = setInterval(updateTimeRemaining, 1000);
        updateTimeRemaining();

        return () => clearInterval(timer);
    }, [discussion?.has_launched, discussion?.time_left]);

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

            <div className="flex flex-col space-y-8">
                {/* Top Metrics */}
                <div className="flex space-x-6">
                    <Card className="flex-1">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Active Groups</p>
                                    <h3 className="text-2xl font-bold">{discussion.group_count}</h3>
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
                                    <h3 className="text-2xl font-bold">{discussion.participant_count}</h3>
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

                {/* Questions and Charts */}
                {discussion.discussion_points.map((point, index) => (
                    <div key={index}>
                        <div className="mb-4">
                            <div className="flex items-start space-x-4 mb-2">
                                <h2 className="text-xl font-bold whitespace-nowrap">Question {index + 1}:</h2>
                                <p className="text-xl text-gray-700">{point.content}</p>
                            </div>
                            <Separator className="mt-4" />
                        </div>

                        <div className="flex space-x-6">
                            {/* Group Answer Frequencies */}
                            <Card className="flex-1">
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium">Group Answer Distribution</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={groupAnswerData} 
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
                                                    fill="#2563eb"
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
                                            <BarChart
                                                data={ethicalPerspectiveData}
                                                layout="vertical"
                                                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis 
                                                    type="category" 
                                                    dataKey="name" 
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ fontSize: 12 }}
                                                    formatter={(value) => [`${value}%`, 'Percentage']}
                                                />
                                                <Bar 
                                                    dataKey="value" 
                                                    fill="#8884d8"
                                                    label={{ position: 'right', fontSize: 12 }}
                                                >
                                                    {ethicalPerspectiveData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
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
                                            <LineChart data={participationData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="time" />
                                                <YAxis domain={[0, 100]} />
                                                <Tooltip />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="rate" 
                                                    stroke="#9333ea" 
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
            </div>
        </div>
    );
}

export default InstructorDashboard;