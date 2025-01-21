
// Sessions
export type Session = {
    id: string
    created_at: string
    status: 'pending' | 'active' | 'completed' 
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

export interface SessionProps {
  params: {
    sessionId: string
  }
}

export interface SessionContentProps {
  sessionId: string
}

export interface JoinSessionClientProps {
  sessionId: string;
}

export interface ConsentPageProps {
  sessionId: string
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
  sessionId: string;
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
  sessionId: string;
  groupId: string;
}

export interface DiscussionGuideProps {
  session: Session | null;
  groupId: string;
}

export interface ChatWindowProps {
  groupId: string;
  sessionId: string;
}

export interface DiscussionGuideProps {
  session: Session | null;
  mode: 'usage-check' | 'waiting-room' | 'discussion';
  groupId: string;
}

export interface Answers {
  [key: string]: string;
}

export interface SharedAnswers {
  [key: string]: string[];
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
  sessionId: string;
  disabled?: boolean;
}