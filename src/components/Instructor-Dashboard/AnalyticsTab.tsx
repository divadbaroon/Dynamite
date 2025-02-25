import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Discussion } from "@/types";
import { COLORS } from '@/lib/data/chartData';
import { fetchUsersBySession } from '@/lib/actions/user';

// Define types for chart data
interface FrameworkData {
  name: string;
  value: number;
}

interface GroupAnswerData {
  answer: string;
  frequency: number;
}

interface ParticipationData {
  time: string;
  rate: number;
}

interface ChartDataState {
  frameworks: FrameworkData[];
  groupAnswers: GroupAnswerData[];
  participation: ParticipationData[];
}

interface AnalyticsTabProps {
  discussion: Discussion;
  timeFilter: number;
  sharedAnswers: any;
  ethicalPerspectives: any;
  commonAnalysis: any;
}

function AnalyticsTab({ 
  discussion, 
  timeFilter, 
  sharedAnswers, 
  ethicalPerspectives,
  commonAnalysis 
}: AnalyticsTabProps) {
  // Add state for each question's data
  const [questionChartData, setQuestionChartData] = useState<ChartDataState[]>([]);
  const [usersData, setUsersData] = useState<any[] | null>(null);
  
  // Calculate current discussion point based on time filter
  const currentDiscussionPoint = Math.min(
    Math.floor(timeFilter / 25),
    discussion?.discussion_points?.length ? discussion.discussion_points.length - 1 : 0
  );

  // Fetch users data
  useEffect(() => {
    async function fetchUsers() {
      if (!discussion?.id) return;
      
      try {
        const { data, error } = await fetchUsersBySession(discussion.id);
        if (error) {
          console.error("Error fetching users:", error);
          return;
        }
        
        if (data) {
          setUsersData(data);
          console.log(`Fetched ${data.length} users for analytics`);
        }
      } catch (err) {
        console.error("Exception during users fetch:", err);
      }
    }
    
    fetchUsers();
  }, [discussion?.id]);

  // Timestamp helper function
  const getTimestampForQuestionTime = (questionIndex: number, progress: number): number => {
    const startTime = discussion?.has_launched 
      ? new Date(discussion.has_launched).getTime() 
      : new Date('2025-02-25T09:00:00.000Z').getTime();
    
    const segmentDuration = 200 * 1000; // 3.3 minutes in milliseconds
    const questionStart = startTime + (questionIndex * segmentDuration);
    const offset = (progress / 100) * segmentDuration;
    
    return questionStart + offset;
  };

  // Filter entries by time range
  const filterEntriesByTimeRange = (entries: any[], start: number, end: number): any[] => {
    if (!Array.isArray(entries)) return [];
    
    return entries.filter(entry => {
      const time = new Date(entry.timestamp).getTime();
      return time >= start && time <= end;
    });
  };

  // Calculate actual participation rate based on users' last_active timestamps
  const calculateParticipationRateByTime = (timestamp: number): number => {
    if (!usersData || usersData.length === 0) return 0;

    // Count users who have been active up to the given timestamp
    const participatedUsers = usersData.filter(user => {
      if (!user.last_active) return false;
      
      try {
        const lastActiveTime = new Date(user.last_active).getTime();
        // User has participated if their last activity was before or at the timestamp
        return lastActiveTime <= timestamp;
      } catch (err) {
        console.warn("Error parsing last_active for user in analytics:", user.id);
        return false;
      }
    });
    
    return Math.round((participatedUsers.length / usersData.length) * 100);
  };

  // Process data for time segments
  useEffect(() => {
    if (!commonAnalysis || !discussion?.discussion_points || !usersData) return;
    
    try {
      const segmentDuration = 200; // seconds per question
      const totalDuration = discussion.discussion_points.length * segmentDuration;
      const elapsedSeconds = (timeFilter / 100) * totalDuration;
      
      const newData: ChartDataState[] = [];
      
      discussion.discussion_points.forEach((point, index) => {
        const questionStart = index * segmentDuration;
        const questionActive = elapsedSeconds >= questionStart;
        
        let questionProgress = 0;
        if (questionActive) {
          const timeIntoQuestion = Math.min(
            elapsedSeconds - questionStart,
            segmentDuration
          );
          questionProgress = (timeIntoQuestion / segmentDuration) * 100;
        }
        
        // Get timestamps for this question segment
        const startTimestamp = getTimestampForQuestionTime(index, 0);
        const endTimestamp = getTimestampForQuestionTime(index, questionProgress);
        
        // Process frameworks
        let frameworks: FrameworkData[] = [];
        if (commonAnalysis?.frameworks && questionActive) {
          frameworks = Object.entries(commonAnalysis.frameworks)
            .map(([framework, entries]: [string, any]) => {
              const filtered = filterEntriesByTimeRange(entries, startTimestamp, endTimestamp);
              const latest = filtered.length > 0 ? filtered[filtered.length - 1] : { frequency: 0 };
              const count = latest.frequency || 0;
              
              return { 
                name: framework,
                value: count
              };
            })
            .filter(item => item.value > 0);
        }

        if (frameworks.length === 0) {
          frameworks = [{ name: 'No data', value: 0 }];
        }
                
        // Process group answers
        let groupAnswers: GroupAnswerData[] = [];
        if (commonAnalysis?.groupAnswers && questionActive) {
          groupAnswers = Object.entries(commonAnalysis.groupAnswers)
            .map(([answer, entries]: [string, any]) => {
              const filtered = filterEntriesByTimeRange(entries, startTimestamp, endTimestamp);
              const latest = filtered.length > 0 ? filtered[filtered.length - 1] : { frequency: 0 };
              
              return { answer, frequency: latest.frequency || 0 };
            })
            .filter(item => item.frequency > 0);
        }
        
        if (groupAnswers.length === 0) {
          groupAnswers = [{ answer: 'No data available', frequency: 0 }];
        }
        
        // Generate participation data based on real user activity
        const participation: ParticipationData[] = [];
        if (questionActive) {
          for (let i = 0; i <= 10; i++) {
            if ((i * 10) <= questionProgress) {
              const seconds = Math.floor((i / 10) * segmentDuration);
              const minutes = Math.floor(seconds / 60);
              const remainingSecs = seconds % 60;
              const timepoint = `${minutes}:${remainingSecs.toString().padStart(2, '0')}`;
              
              // Calculate timestamp for this point in the question
              const pointTimestamp = getTimestampForQuestionTime(index, (i * 10));
              
              // Get actual participation rate from user data
              const participationRate = calculateParticipationRateByTime(pointTimestamp);
              
              participation.push({
                time: timepoint,
                rate: participationRate
              });
            }
          }
        }
        
        if (participation.length === 0) {
          participation.push({ time: '0:00', rate: 0 });
        }
        
        // Add to chart data array
        newData.push({
          frameworks,
          groupAnswers,
          participation
        });
      });
      
      setQuestionChartData(newData);
      
    } catch (error) {
      console.error('Error processing chart data:', error);
    }
  }, [commonAnalysis, timeFilter, discussion, usersData]);

  if (!discussion?.discussion_points || discussion.discussion_points.length === 0) {
    return <div>No discussion points available</div>;
  }

  // Render the component
  return (
    <>
      {discussion.discussion_points.map((point, index) => {
        // Get chart data for this question
        const chartData = questionChartData[index] || {
          frameworks: [{ name: 'No data', value: 100 }],
          groupAnswers: [{ answer: 'No data available', frequency: 0 }],
          participation: [{ time: '0:00', rate: 0 }]
        };
               
        return (
          <div key={index} className={`mb-8 p-4 border rounded-lg ${currentDiscussionPoint === index ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
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
                  <CardTitle className="text-sm font-medium">
                    Group Answer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                <div className="h-64">
                  {(!chartData.groupAnswers || chartData.groupAnswers.length === 0 || 
                    (chartData.groupAnswers.length === 1 && chartData.groupAnswers[0].frequency === 0)) ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500 text-lg">No Data</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={chartData.groupAnswers} 
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
                  )}
                </div>
                </CardContent>
              </Card>

             {/* Ethical Perspectives Distribution */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Ethical Perspectives
                </CardTitle>
              </CardHeader>
              <CardContent>
              <div className="h-64">
                {(!chartData.frameworks || chartData.frameworks.length === 0 || 
                  (chartData.frameworks.length === 1 && chartData.frameworks[0].name === 'No data')) ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-lg">No Data</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.frameworks}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.frameworks.map((entry, i) => (
                          <Cell 
                            key={`cell-${i}`} 
                            fill={entry.name === 'No data' ? '#cccccc' : COLORS[i % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value}`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              </CardContent>
            </Card>

              {/* Participation Rate */}
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Participation Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                <div className="h-64">
                  {(!chartData.participation || chartData.participation.length === 0 || 
                    (chartData.participation.length === 1 && chartData.participation[0].rate === 0)) ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500 text-lg">No Data</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.participation}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Participation']} />
                        <Line 
                          type="monotone" 
                          dataKey="rate" 
                          stroke="#9333ea"
                          strokeWidth={2}
                          name="Participation %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default AnalyticsTab;