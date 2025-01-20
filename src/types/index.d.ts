
// Sessions
export type Session = {
    id: string
    created_at: string
    status: boolean
    title: string
    task: string | null
    scenario: string | null
    discussion_points: string[]
    author: string | null
    time_left: integer
    participant_count?: number
    group_count?: number
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