// Dynamic chart data that adapts based on the progress bar position
// We'll have 3 discussion points, each with a 3-minute window

export const COLORS = ['#2563eb', '#16a34a', '#9333ea', '#ea580c'];

export function generateChartData(timeFilter: any) {
  // Convert timeFilter (0-100) to minutes (0-10)
  const currentMinute = (timeFilter / 100) * 10;
  
  // Determine which discussion point we're in (0, 1, or 2)
  const currentDiscussionPoint = Math.min(Math.floor(currentMinute / 3), 2);
  
  // Calculate progress within the current discussion point (0-1)
  const progressInDiscussionPoint = Math.min((currentMinute % 3) / 3, 1);
  
  // Generate group answer data
  const groupAnswerData = generateGroupAnswerData(currentDiscussionPoint, progressInDiscussionPoint);
  
  // Generate ethical perspective data
  const ethicalPerspectiveData = generateEthicalPerspectiveData(currentDiscussionPoint, progressInDiscussionPoint);
  
  // Generate participation rate data
  const participationData = generateParticipationData(currentMinute);
  
  return {
    groupAnswerData,
    ethicalPerspectiveData,
    participationData,
    currentDiscussionPoint
  };
}

function generateGroupAnswerData(discussionPoint: any, progress: any) {
  // Define base data for each discussion point
  const baseData = [
    [ // Discussion Point 1 - Environmental Ethics
      { answer: "Implement stricter regulations", maxFrequency: 5 },
      { answer: "Increase public awareness", maxFrequency: 4 },
      { answer: "Develop new technologies", maxFrequency: 3 },
      { answer: "Establish community programs", maxFrequency: 2 },
      { answer: "Create incentive systems", maxFrequency: 2 },
    ],
    [ // Discussion Point 2 - Data Privacy
      { answer: "Protect individual privacy", maxFrequency: 6 },
      { answer: "Enhance data security", maxFrequency: 5 },
      { answer: "Implement transparency", maxFrequency: 4 },
      { answer: "Provide user education", maxFrequency: 3 },
      { answer: "Create opt-out mechanisms", maxFrequency: 2 },
    ],
    [ // Discussion Point 3 - Healthcare Ethics
      { answer: "Address healthcare access", maxFrequency: 5 },
      { answer: "Ensure equal treatment", maxFrequency: 4 },
      { answer: "Promote diversity in research", maxFrequency: 4 },
      { answer: "Prevent algorithmic bias", maxFrequency: 3 },
      { answer: "Support vulnerable groups", maxFrequency: 2 },
    ]
  ];
  
  if (progress === 0) return [];

  return baseData[discussionPoint].map(item => ({
    answer: item.answer,
    frequency: Math.ceil(item.maxFrequency * progress)
  }));
}

function generateEthicalPerspectiveData(discussionPoint: any, progress: any) {
  // Define base data for each discussion point
  const baseData = [
    [ // Discussion Point 1 - Environmental Ethics
      { name: 'Deontological', maxValue: 35 },
      { name: 'Utilitarian', maxValue: 25 },
      { name: 'Virtue Ethics', maxValue: 20 },
      { name: 'Care Ethics', maxValue: 20 },
    ],
    [ // Discussion Point 2 - Data Privacy
      { name: 'Privacy Rights', maxValue: 40 },
      { name: 'Autonomy', maxValue: 30 },
      { name: 'Justice', maxValue: 15 },
      { name: 'Transparency', maxValue: 15 },
    ],
    [ // Discussion Point 3 - Healthcare Ethics
      { name: 'Justice', maxValue: 35 },
      { name: 'Equity', maxValue: 30 },
      { name: 'Beneficence', maxValue: 20 },
      { name: 'Non-maleficence', maxValue: 15 },
    ]
  ];

  if (progress === 0) return [];
  
  // Apply progress to scale up values gradually
  return baseData[discussionPoint].map(item => ({
    name: item.name,
    value: Math.max(5, Math.ceil(item.maxValue * progress))
  }));
}

function generateParticipationData(currentMinute: any) {
  // Create participation rate data showing the evolution over time
  // with drops at discussion point transitions
  
  // Define key points in our participation timeline
  const timeline = [
    { time: 0, rate: 40 },  // Start
    { time: 1.5, rate: 80 }, // Mid-point of discussion 1
    { time: 3, rate: 65 },  // End of discussion 1
    { time: 3.1, rate: 50 }, // Start of discussion 2
    { time: 4.5, rate: 85 }, // Mid-point of discussion 2
    { time: 6, rate: 70 },  // End of discussion 2
    { time: 6.1, rate: 60 }, // Start of discussion 3
    { time: 7.5, rate: 90 }, // Mid-point of discussion 3
    { time: 9, rate: 80 },  // End of discussion 3
    { time: 10, rate: 75 }  // Final time
  ];
  
  // Filter to only include data points up to the current time
  const filteredTimeline = timeline.filter(point => point.time <= currentMinute);
  
  // Ensure we have at least one data point
  if (filteredTimeline.length === 0) {
    return [{ time: '0min', rate: 40 }];
  }
  
  // Format the data for the chart
  return filteredTimeline.map(point => ({
    time: `${point.time.toFixed(1)}min`,
    rate: point.rate
  }));
}

// Export default data for initial load
export const initialGroupAnswerData = [
  { answer: "Loading data...", frequency: 0 }
];

export const initialEthicalPerspectiveData = [
  { name: 'Loading...', value: 0 }
];

export const initialParticipationData = [
  { time: '0min', rate: 40 }
];