import { 
    GroupAnswerData, 
    EthicalPerspectiveData, 
    ParticipationData, 
    ChartData 
  } from '@/types';
  
  // Colors for charts
  export const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  
  // Initial data for charts
  export const initialGroupAnswerData: GroupAnswerData[] = [
    { answer: "No data yet", frequency: 0 }
  ];
  
  export const initialEthicalPerspectiveData: EthicalPerspectiveData[] = [
    { name: "No data", value: 100 }
  ];
  
  export const initialParticipationData: ParticipationData[] = [
    { time: "0:00", rate: 0 }
  ];
  
  /**
   * Generate mock chart data based on time filter value
   * In a real application, this would be replaced with actual data from the backend
   */
  export const generateChartData = (timeFilter: number): ChartData => {
    // Determine which discussion point we're at based on time
    const currentPoint = Math.floor(timeFilter / 30); // Assuming 3 points, change at 30%, 60%, 90%
    
    // Group answer data - changes based on discussion point
    const groupAnswerOptions = [
      // Point 1 options
      [
        { answer: "Copyright training", frequency: Math.floor(timeFilter/5) },
        { answer: "Transparency", frequency: Math.floor(timeFilter/10) },
        { answer: "Data filtering", frequency: Math.floor(timeFilter/15) },
        { answer: "Attribution", frequency: Math.floor(timeFilter/20) }
      ],
      // Point 2 options
      [
        { answer: "Commercial model", frequency: Math.floor(timeFilter/8) },
        { answer: "Transform. use", frequency: Math.floor(timeFilter/6) },
        { answer: "Legal framework", frequency: Math.floor(timeFilter/10) },
        { answer: "No consensus", frequency: Math.floor(timeFilter/15) }
      ],
      // Point 3 options
      [
        { answer: "Licensing", frequency: Math.floor(timeFilter/5) },
        { answer: "Fair use", frequency: Math.floor(timeFilter/7) },
        { answer: "Copyright reform", frequency: Math.floor(timeFilter/9) },
        { answer: "Creator compensation", frequency: Math.floor(timeFilter/8) }
      ]
    ];
    
    // Calculate the progress within the current point (0-100%)
    const pointProgress = (timeFilter % 30) / 30 * 100;
    
    // Ethical perspectives data - changes based on discussion point
    const ethicalPerspectiveOptions = [
      // Point 1 options
      [
        { name: "Utilitarian", value: 25 + Math.floor(pointProgress/10) },
        { name: "Deontological", value: 20 + Math.floor(pointProgress/8) },
        { name: "Virtue Ethics", value: 15 + Math.floor(pointProgress/15) },
        { name: "Social Contract", value: 10 + Math.floor(pointProgress/20) }
      ],
      // Point 2 options
      [
        { name: "Utilitarian", value: 20 + Math.floor(pointProgress/12) },
        { name: "Deontological", value: 30 + Math.floor(pointProgress/10) },
        { name: "Virtue Ethics", value: 10 + Math.floor(pointProgress/18) },
        { name: "Social Contract", value: 15 + Math.floor(pointProgress/15) }
      ],
      // Point 3 options
      [
        { name: "Utilitarian", value: 15 + Math.floor(pointProgress/15) },
        { name: "Deontological", value: 15 + Math.floor(pointProgress/14) },
        { name: "Virtue Ethics", value: 25 + Math.floor(pointProgress/10) },
        { name: "Social Contract", value: 20 + Math.floor(pointProgress/12) }
      ]
    ];
    
    // Participation rate data - changes based on timeFilter
    const participationData: ParticipationData[] = [];
    // Generate data points for participation rate
    for (let i = 0; i <= 10; i++) {
      const timeMark = i * 10; // 0%, 10%, 20%, etc.
      if (timeMark <= timeFilter) {
        const baseRate = 60; // start at 60% participation
        let noise = Math.sin(i * 0.5) * 10; // some variation
        let trend = Math.min(i * 2, 20); // gradually increase
        let rate = Math.min(100, Math.max(50, baseRate + noise + trend));
        
        // Format time as mm:ss
        const minutes = Math.floor((timeMark / 100) * 10); // 10 minute total discussion
        const seconds = Math.floor(((timeMark / 100) * 10 * 60) % 60);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        participationData.push({
          time: timeStr,
          rate: Math.round(rate)
        });
      }
    }
    
    // Return the combined chart data
    return {
      groupAnswerData: groupAnswerOptions[Math.min(currentPoint, 2)],
      ethicalPerspectiveData: ethicalPerspectiveOptions[Math.min(currentPoint, 2)],
      participationData,
      currentDiscussionPoint: currentPoint
    };
  };
  
  /**
   * Format a timestamp into a human-readable time
   */
  export const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };