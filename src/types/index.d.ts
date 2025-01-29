
// Sessions
export type Discussion = {
    id: string
    created_at: string
    status: 'draft' | 'active' | 'completed' 
    title: string
    task: string | null
    scenario: string | null
    discussion_points: string[]
    author: string | null
    time_left: integer
    participant_count?: number
    group_count?: number
    current_point?: number
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

export interface ConsentPageProps {
  discussionId: string
  onAccountCreated: () => void
  onError: (error: string) => void
}

// Groups 
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

// Messages
export interface Message {
  id: string;
  content: string;
  user_id: string;
  username: string;
  created_at: string;
  audio_url?: string | null;  
  group_id?: string;        
}

// Discussion
export interface DiscussionClientProps {
  discussionId: string;
  groupId: string;
}

export interface DiscussionGuideProps {
  discussion: Discussion | null;
  groupId: string;
}

export interface ChatWindowProps {
  groupId: string;
  discussionId: string;
}

export interface DiscussionGuideProps {
  discussion: Discussion | null;
  mode: 'usage-check' | 'waiting-room' | 'discussion';
  groupId: string;
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

// User

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

// Audio

export interface AudioInputProps {
  onMessageSubmit: (message: string) => Promise<void>;
  userId: string;
  discussionId: string;
  disabled?: boolean;
}

// ====== WAITING-ROOM PAGE

export interface WaitingRoomProps {
  params: {
    discussionId: string;
    groupId: string;
  }
}

// Navbar

export interface NavbarProps {
  user: User | null
}

// Discussion Points

export interface DiscussionPointsProps {
  discussion: Discussion;
  mode: string;
  currentPointIndex: number;
  openItem: string | undefined;
  setOpenItem: (value: string | undefined) => void;
  sharedAnswers: SharedAnswers;
  editingPoint: { index: number; bulletIndex: number; } | null;
  setEditingPoint: (point: { index: number; bulletIndex: number; } | null) => void;
  editedContent: string;
  setEditedContent: (content: string) => void;
  handleSaveEdit: (index: number, bulletIndex: number, content: string) => void;
  handleDelete: (index: number, bulletIndex: number) => void;
  handleUndo: (index: number, bulletIndex: number) => void;  
  pointTimeLeft: number;
  timeLeft: number;
  currentPointDuration: number
}

// Answer Review Dialog

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

// Ratings

export interface Ratings {
  usability: number
  content: number
  overall: number
}

export interface StarRatingProps {
  name: string
  onChange: (rating: number) => void
}
