import { GroupAnswer, EthicalPerspective, ParticipationRate } from "@/types"

export const COLORS = ['#2563eb', '#16a34a', '#9333ea', '#ea580c'];

export const groupAnswerData: GroupAnswer[] = [
  { answer: "Implement stricter regulations", frequency: 5 },
  { answer: "Increase public awareness", frequency: 4 },
  { answer: "Develop new technologies", frequency: 3 },
  { answer: "Establish community programs", frequency: 2 },
  { answer: "Create incentive systems", frequency: 2 },
];

export const ethicalPerspectiveData: EthicalPerspective[] = [
  { name: 'Utilitarian', value: 35 },
  { name: 'Deontological', value: 25 },
  { name: 'Virtue Ethics', value: 20 },
  { name: 'Care Ethics', value: 20 },
];

export const participationData: ParticipationRate[] = [
  { time: '0min', rate: 40 },
  { time: '5min', rate: 65 },
  { time: '10min', rate: 80 },
  { time: '15min', rate: 75 },
];