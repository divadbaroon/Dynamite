import { useState, useEffect } from 'react';

export interface GroupAnswerData {
  answer: string;
  frequency: number;
}

export interface EthicalPerspectiveData {
  name: string;
  value: number;
}

export interface ParticipationData {
  time: string;
  rate: number;
}

export interface ChartData {
  groupAnswerData: GroupAnswerData[];
  ethicalPerspectiveData: EthicalPerspectiveData[];
  participationData: ParticipationData[];
  currentDiscussionPoint: number;
}

// Fallback data
const fallbackGroupAnswerData: GroupAnswerData[] = [
  { answer: "No data available", frequency: 0 }
];

const fallbackEthicalPerspectiveData: EthicalPerspectiveData[] = [
  { name: "No data", value: 100 }
];

const fallbackParticipationData: ParticipationData[] = [
  { time: "0:00", rate: 0 },
  { time: "10:00", rate: 0 }
];

export function useChartData(
  timeFilter: number, 
  commonAnalysis: any = null, 
  discussionPoints: any[] = []
) {
  const [currentChartData, setCurrentChartData] = useState<ChartData>({
    groupAnswerData: fallbackGroupAnswerData,
    ethicalPerspectiveData: fallbackEthicalPerspectiveData,
    participationData: fallbackParticipationData,
    currentDiscussionPoint: 0
  });

  const [chartDataHistory, setChartDataHistory] = useState<ChartData[]>([]);

  // Simple approach to process the data
  useEffect(() => {
    // Calculate the current discussion point (0, 1, 2, etc.)
    const currentDiscussionPoint = Math.min(
      Math.floor(timeFilter / 25),
      discussionPoints?.length ? discussionPoints.length - 1 : 0
    );
    
    try {
      // Direct data processing based on timeFilter
      
      // GROUP ANSWERS
      let groupAnswerData = fallbackGroupAnswerData;
      
      if (commonAnalysis?.groupAnswers) {
        // Convert to array format needed for the chart
        const entries = Object.entries(commonAnalysis.groupAnswers).map(([key, value]: [string, any]) => {
          // Get max frequency available based on time filter
          const maxFrequency = Math.ceil(value.length * (timeFilter / 100));
          const actualFrequency = maxFrequency > 0 ? maxFrequency : 0;
          
          return {
            answer: key,
            frequency: actualFrequency
          };
        }).filter(item => item.frequency > 0);
        
        if (entries.length > 0) {
          groupAnswerData = entries;
        }
      }
      
      // ETHICAL PERSPECTIVES
      let ethicalPerspectiveData = fallbackEthicalPerspectiveData;
      
      if (commonAnalysis?.frameworks) {
        // Get total value to calculate percentages
        let totalFrequency = 0;
        
        const entries = Object.entries(commonAnalysis.frameworks).map(([key, value]: [string, any]) => {
          // Get max frequency available based on time filter
          const maxFrequency = Math.ceil(value.length * (timeFilter / 100));
          const actualFrequency = maxFrequency > 0 ? maxFrequency : 0;
          totalFrequency += actualFrequency;
          
          return {
            framework: key,
            frequency: actualFrequency
          };
        }).filter(item => item.frequency > 0);
        
        if (entries.length > 0 && totalFrequency > 0) {
          ethicalPerspectiveData = entries.map(item => ({
            name: item.framework,
            value: Math.round((item.frequency / totalFrequency) * 100)
          }));
        }
      }
      
      // PARTICIPATION DATA (simulated)
      const participationData = [];
      for (let i = 0; i <= 10; i++) {
        const currentPercent = i * 10;
        if (currentPercent <= timeFilter) {
          const minutes = Math.floor((i * 10 * 60) / 100 / 60);
          const seconds = Math.floor((i * 10 * 60) / 100 % 60);
          const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          participationData.push({
            time: timeLabel,
            rate: Math.min(50 + (i * 5), 90) // Increases from 50% to 90%
          });
        }
      }
      
      // Update chart data
      const newChartData = {
        groupAnswerData,
        ethicalPerspectiveData,
        participationData,
        currentDiscussionPoint
      };
      
      console.log('New chart data:', {
        groupAnswers: groupAnswerData.length,
        ethicalPerspectives: ethicalPerspectiveData.length,
        participationPoints: participationData.length,
        timeFilter
      });
      
      // Freeze previous question data
      if (newChartData.currentDiscussionPoint > chartDataHistory.length) {
        setChartDataHistory(prev => [...prev, currentChartData]);
      }
      
      setCurrentChartData(newChartData);
      
    } catch (error) {
      console.error('Error processing chart data:', error);
    }
  }, [timeFilter, commonAnalysis, discussionPoints, chartDataHistory.length]);
  
  // Generate data for all questions
  const getQuestionChartData = (points: any[] = []) => {
    return points.map((_, index) => {
      if (index < chartDataHistory.length) {
        // Completed questions - use frozen data
        return chartDataHistory[index];
      } else if (index === chartDataHistory.length) {
        // Current question
        return currentChartData;
      } else {
        // Future questions
        return {
          groupAnswerData: fallbackGroupAnswerData,
          ethicalPerspectiveData: fallbackEthicalPerspectiveData,
          participationData: fallbackParticipationData,
          currentDiscussionPoint: index
        };
      }
    });
  };

  return {
    currentChartData,
    chartDataHistory,
    getQuestionChartData
  };
}