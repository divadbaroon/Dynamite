export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      answers: {
        Row: {
          answers: Json
          created_at: string
          id: string
          session_id: string | null
          submitted_at: string
          user_id: string | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          session_id?: string | null
          submitted_at?: string
          user_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          session_id?: string | null
          submitted_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string
          id: string
          number: number
          session_id: string | null
          users_list: string[] | null
        }
        Insert: {
          created_at?: string
          id?: string
          number: number
          session_id?: string | null
          users_list?: string[] | null
        }
        Update: {
          created_at?: string
          id?: string
          number?: number
          session_id?: string | null
          users_list?: string[] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string
          group_id: string | null
          id: string
          session_id: string | null
          user_id: string | null
          username: string
          current_point: number
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string
          group_id?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string
          group_id?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          author: string | null
          created_at: string
          current_point: number | null
          discussion_points: Json | null
          group_count: number | null
          id: string
          participant_count: number | null
          scenario: string | null
          status: string | null
          task: string | null
          time_left: number | null
          title: string | null
        }
        Insert: {
          author?: string | null
          created_at?: string
          current_point?: number | null
          discussion_points?: Json | null
          group_count?: number | null
          id?: string
          participant_count?: number | null
          scenario?: string | null
          status?: string | null
          task?: string | null
          time_left?: number | null
          title?: string | null
        }
        Update: {
          author?: string | null
          created_at?: string
          current_point?: number | null
          discussion_points?: Json | null
          group_count?: number | null
          id?: string
          participant_count?: number | null
          scenario?: string | null
          status?: string | null
          task?: string | null
          time_left?: number | null
          title?: string | null
        }
        Relationships: []
      }
      shared_answers: {
        Row: {
          answers: Json
          group_id: string
          id: string
          last_updated: string
          session_id: string | null
        }
        Insert: {
          answers?: Json
          group_id: string
          id?: string
          last_updated?: string
          session_id?: string | null
        }
        Update: {
          answers?: Json
          group_id?: string
          id?: string
          last_updated?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          consent_status: boolean | null
          created_at: string | null
          id: string
          session_id: string | null
          username: string | null
        }
        Insert: {
          consent_status?: boolean | null
          created_at?: string | null
          id: string
          session_id?: string | null
          username?: string | null
        }
        Update: {
          consent_status?: boolean | null
          created_at?: string | null
          id?: string
          session_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
