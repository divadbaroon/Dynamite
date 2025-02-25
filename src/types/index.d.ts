
// ====== SESSIONS

export type Discussion = {
    id: string
    created_at: string
    status: 'draft' | 'active' | 'completed' 
    title: string
    task: string | null
    scenario: string | null
    discussion_points: DiscussionPoint[]
    author: string | null
    time_left: integer
    participant_count?: number
    group_count?: number
    current_point?: number
    has_launched?: string
  }

export type DiscussionPoint = {
  content: string;             
  index: number;              
  scheduled_start: string;     
  duration: number;           
}

export interface PointTimerDisplayProps {
  discussion: Discussion
  discussionPoint: DiscussionPoint;
  currentPointIndex: number;
  totalPoints: number;
  isRunning: boolean;
  onTimeUp?: () => Promise<void>;
}

export interface DiscussionProps {
  params: {
    discussionId: string
  }
}

export interface DiscussionContentProps {
  discussionId: string
}

export interface JoinDiscussionClientProps {
  discussionId: string;
}

export interface UseDiscussionProps {
  discussionId?: string
  setCurrentPointIndex: (index: number) => void
}

export interface ConsentPageProps {
  discussionId: string
  onAccountCreated: () => void
  onError: (error: string) => void
}

export type CreateDiscussionInput = Omit<Discussion, 'id' | 'created_at' | 'author' | 'discussion_points'> & {
  discussion_points: string[]
}

// ====== GROUPS

export interface Group {
  id: string
  session_id: string
  number: number
  users_list: string[]
  created_at: string
}

export type GroupJoinResponse = {
  group: Group | null
  error: Error | null
}

export interface GroupSelectionClientProps {
  discussionId: string;
}

export interface UseDiscussionStatusProps {
  discussionId: string;
  onDiscussionStart?: () => void;
}

// ====== MESSAGE

export interface Message {
  id: string;
  content: string;
  user_id: string;
  username: string;
  created_at: string;
  audio_url?: string | null;  
  group_id?: string;        
  current_point?: number;
}

// ====== DISCUSSION

export interface DiscussionClientProps {
  discussionId: string;
  groupId: string;
}

export interface ChatWindowProps {
  groupId: string;
  discussionId: string;
  isTimeUp: boolean;
  messages: Message[];
  loading: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  currentPointIndex: number 
  user: User | null;
}

export interface DiscussionGuideProps {
  discussion: Discussion | null
  mode: 'discussion' | 'waiting-room'
  groupId: string
  sharedAnswers: SharedAnswers
  currentPointIndex: number
  isRunning: boolean
  openItem: string
  loading?: boolean
  isTimeUp: boolean
  setCurrentPointIndex: (index: number) => void;
  setIsTimeUp: (value: boolean) => void;
}

export interface EditingPoint {
  index: number
}

export interface Answers {
  [key: string]: string;
}

export interface BulletPoint {
  content: string;
  isDeleted?: boolean;
}

export interface SharedAnswers {
  [key: string]: BulletPoint[];
}

export interface SharedAnswersRow {
  id?: string;
  group_id: string;
  session_id: string;
  answers: SharedAnswers;  
  last_updated: string;
}

// ====== USER

export interface SupabaseUser {
  id: string
  email?: string
  phone?: string
  display_name?: string
  providers?: string[]
  provider_type?: string
  created_at: string
  last_sign_in_at?: string
}

export interface UserData {
  id: string
  username: string
  session_id: string | null
  created_at: string
  consent_status: boolean
}

// ====== AUDIO

export interface AudioInputProps {
  onMessageSubmit: (message: string) => Promise<void>;
  userId: string;
  discussionId: string;
  disabled?: boolean;
  isTimeUp?: boolean;
}

// ====== WAITING-ROOM

export interface WaitingRoomProps {
  params: {
    discussionId: string;
    groupId: string;
  }
}

export interface WaitingRoomClientProps {
  discussionId: string;
  groupId: string;
}

export interface WaitingRoomGuideProps {
  discussion: Discussion | null;
}

export interface UseDiscussionTransitionProps {
  discussionId: string;
  groupId: string;
  onTransitionStart: () => void;
  onTransitionError: () => void;
  navigate: (path: string) => void;
}

// ====== NAVBAR

export interface NavbarProps {
  user: User | null
}

// ====== DISCUSSION-POINTS

export interface DiscussionPointsProps {
  discussion: Discussion;
  mode: string;
  currentPointIndex: number;
  setCurrentPointIndex: (index: number) => void;
  openItem: string | undefined;
  sharedAnswers: SharedAnswers;
  editingPoint: { index: number; bulletIndex: number; } | null;
  setEditingPoint: (point: { index: number; bulletIndex: number; } | null) => void;
  editedContent: string;
  setEditedContent: (content: string) => void;
  handleSaveEdit: (index: number, bulletIndex: number, content: string) => void;
  handleDelete: (index: number, bulletIndex: number) => void;
  handleUndo: (index: number, bulletIndex: number) => void;  
  isRunning: boolean;
}

//  ====== ANSWER-REVIEW

export interface ReviewDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isTimeUp: boolean;
  discussion: Discussion;
  sharedAnswers: SharedAnswers;
  editingPoint: { index: number; bulletIndex: number; } | null;
  setEditingPoint: (point: { index: number; bulletIndex: number; } | null) => void;
  editedContent: string;
  setEditedContent: (content: string) => void;
  handleSaveEdit: (index: number, bulletIndex: number, content: string) => void;
  handleDelete: (index: number, bulletIndex: number) => void;
  handleUndo: (index: number, bulletIndex: number) => void;
  groupId: string;
  userId: string;
}

//  ====== FEEDBACK

export interface Ratings {
  usability: number
  content: number
  overall: number
}

export interface StarRatingProps {
  name: string
  onChange: (rating: number) => void
}

//  ====== CHAT

export interface UseChatActionsProps {
  user: SupabaseUser | null
  userData: UserData | null
  hasConsented: boolean | null
  discussionId: string
  groupId: string
  currentPointIndex: number 
  setNewMessage: (message: string) => void
}

export interface UseSessionSubscriptionProps {
  sessionId?: string  
  currentPointIndex: number
  setIsRunning: (isRunning: boolean) => void
  setCurrentPointIndex: (index: number) => void
  setOpenItem: (item: string) => void
}

export interface UseTimerProps {
  discussion: Discussion | null 
  mode: string
  isRunning: boolean
  onTimeUp?: () => void
}

export interface EditingPoint {
  index: number
  bulletIndex: number
}

export interface MessageData {
  content: string
  created_at: string
  username: string
  userId: string
}

export interface RequestBody {
  sessionId: string;
  messages: MessageData[];
  currentPoint: DiscussionPoint;   
  sharedAnswers: SharedAnswers;    
}
export interface UseDiscussionReturn {
  discussion: Discussion | null
  loading: boolean
  error: string | null
  isRunning: boolean
  isTimeUp: boolean
  currentPointIndex: number
  openItem: string
  setIsRunning: (value: boolean) => void
  setIsTimeUp: (value: boolean) => void
  handleSetCurrentPoint: (index: number) => void 
}

export interface UseTranscriptAnalysisRunnerProps {
    discussionId: string | undefined
    groupId: string
    messages: Message[] 
    isTimeUp: boolean
    currentPoint: DiscussionPoint;  
    sharedAnswers: SharedAnswers; 
}

export interface UseTranscriptAnalysisRunnerReturn {
    isAnalyzing: boolean
    status: string | null
}

export interface VerificationPoint {
  point: string;
  verified: boolean;
  reason: string;
}

export interface VerificationResponse {
  verifiedPoints: VerificationPoint[];
}

//  ====== MONITOR

export interface MonitorClientProps {
  sessionId: string;
}

export interface GroupAnswer {
  answer: string;
  frequency: number;
}

export interface ParticipationRate {
  time: string;
  rate: number;
}

export interface EthicalPerspective {
  framework: string;
  quote: string;
  explanation: string;
  username: string;
}

export interface PerspectiveEntry {
  id: string;
  session_id: string;
  group_id: string;
  current_point: number;
  perspectives: EthicalPerspective[];
  created_at: string;
  groups: {
      id: string;
      name: string;
  };
}

export interface AnalysisResponse {
  success: boolean
  message: string
  analysis?: {
    perspectives: EthicalPerspective[]
  }
  error?: string
  inProgress?: boolean
}

export interface SimulatorPageProps {
  discussionId: string
}

export interface SimulationMessage {
  id: string
  group_id: string
  session_id: string
  username: string
  user_id: string
  created_time: string
  content: string
}

export interface SimulationData {
  session_id: string
  session_start_time: string
  groups: {
    [key: string]: SimulationMessage[]
  }
}

export interface GroupProgress {
  totalMessages: number
  sentMessages: number
  isComplete: boolean
}

export interface TimeProgressBarProps {
  timeFilter: number;
  setTimeFilter: (value: number) => void;
  currentTimeDisplay: string;
  filteredCount: number;
  totalCount: number;
}

export interface UseEthicalAnalysisRunnerProps {
  discussionId: string;
  groupId: string;
  messages: Message[];
  isTimeUp: boolean;
  currentPoint: DiscussionPoint;
}

export interface UseEthicalAnalysisRunnerReturn {
  isAnalyzing: boolean;
  status: string | null;
  analysisResult: {
      perspectives: Array<{
          framework: string;
          quote: string;
          explanation: string;
          username: string;
      }>;
  } | null;
}

export interface AnalysisRunnerProps {
  discussionId: string;
  groupId: string;
  messages: Message[];
  isTimeUp: boolean;
  currentPoint: DiscussionPoint;
  sharedAnswers: SharedAnswers;
}

export interface AnalysisRunnerReturn {
  isAnalyzingTranscript: boolean;
  transcriptStatus: string | null;
  isAnalyzingEthics: boolean;
  ethicsStatus: string | null;
  ethicalAnalysisResult: {
      perspectives: Array<{
          framework: string;
          quote: string;
          explanation: string;
          username: string;
      }>;
  } | null;
}

export interface EthicalPerspective {
  framework: string;
  quote: string;
  explanation: string;
  username: string;
}

export interface EthicalAnalysisResult {
  perspectives: EthicalPerspective[];
}