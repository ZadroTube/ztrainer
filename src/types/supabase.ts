export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string
          created_at: string
          id: number
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: number
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: number
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      body_metrics: {
        Row: {
          bicep_l_cm: number | null
          bicep_r_cm: number | null
          chest_cm: number | null
          created_at: string
          date: string
          hips_cm: number | null
          id: string
          notes: string | null
          thigh_l_cm: number | null
          thigh_r_cm: number | null
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          bicep_l_cm?: number | null
          bicep_r_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          date: string
          hips_cm?: number | null
          id?: string
          notes?: string | null
          thigh_l_cm?: number | null
          thigh_r_cm?: number | null
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          bicep_l_cm?: number | null
          bicep_r_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          date?: string
          hips_cm?: number | null
          id?: string
          notes?: string | null
          thigh_l_cm?: number | null
          thigh_r_cm?: number | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_adaptations: {
        Row: {
          created_at: string
          explanation: string
          id: string
          status: string
          suggested_changes: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          explanation: string
          id?: string
          status: string
          suggested_changes: Json
          user_id: string
        }
        Update: {
          created_at?: string
          explanation?: string
          id?: string
          status?: string
          suggested_changes?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_adaptations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      completed_sets: {
        Row: {
          completed_at: string
          id: string
          plan_date: string
          set_index: number
          user_id: string
          workout_plan_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          plan_date: string
          set_index: number
          user_id: string
          workout_plan_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          plan_date?: string
          set_index?: number
          user_id?: string
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_sets_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_rests: {
        Row: {
          actual_rest_seconds: number
          id: string
          recorded_at: string
          user_id: string
          workout_plan_id: string
        }
        Insert: {
          actual_rest_seconds: number
          id?: string
          recorded_at?: string
          user_id: string
          workout_plan_id: string
        }
        Update: {
          actual_rest_seconds?: number
          id?: string
          recorded_at?: string
          user_id?: string
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_rests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_rests_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          archived_at: string | null
          created_at: string
          default_reps: number
          default_rest_time_seconds: number
          default_sets: number
          default_weight_kg: number | null
          id: string
          name: string
          target_muscle_group: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          default_reps?: number
          default_rest_time_seconds?: number
          default_sets?: number
          default_weight_kg?: number | null
          id?: string
          name: string
          target_muscle_group?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          default_reps?: number
          default_rest_time_seconds?: number
          default_sets?: number
          default_weight_kg?: number | null
          id?: string
          name?: string
          target_muscle_group?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          added_by: string | null
          created_at: string | null
          description: string | null
          duration: string | null
          genres: string[] | null
          husband_rating: string | null
          id: number
          interesting_facts: string | null
          media_type: string | null
          poster_url: string | null
          rating: number | null
          release_year: number | null
          status: string | null
          telegram_id: number | null
          title: string
          tmdb_id: number | null
          trailer_url: string | null
          updated_at: string | null
          user_uuid: string | null
          watch_date: string | null
          wife_rating: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          genres?: string[] | null
          husband_rating?: string | null
          id?: number
          interesting_facts?: string | null
          media_type?: string | null
          poster_url?: string | null
          rating?: number | null
          release_year?: number | null
          status?: string | null
          telegram_id?: number | null
          title: string
          tmdb_id?: number | null
          trailer_url?: string | null
          updated_at?: string | null
          user_uuid?: string | null
          watch_date?: string | null
          wife_rating?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          genres?: string[] | null
          husband_rating?: string | null
          id?: number
          interesting_facts?: string | null
          media_type?: string | null
          poster_url?: string | null
          rating?: number | null
          release_year?: number | null
          status?: string | null
          telegram_id?: number | null
          title?: string
          tmdb_id?: number | null
          trailer_url?: string | null
          updated_at?: string | null
          user_uuid?: string | null
          watch_date?: string | null
          wife_rating?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movies_user_uuid_fkey"
            columns: ["user_uuid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          available_minutes: number | null
          birth_year: number | null
          created_at: string
          equipment: string | null
          first_name: string | null
          fitness_goal: string | null
          fitness_level: string | null
          gender: string | null
          health_limitations: string | null
          id: string
          last_name: string | null
          photo_url: string | null
          progress_report_cache: string | null
          progress_report_hash: string | null
          telegram_id: number | null
          training_location: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          available_minutes?: number | null
          birth_year?: number | null
          created_at?: string
          equipment?: string | null
          first_name?: string | null
          fitness_goal?: string | null
          fitness_level?: string | null
          gender?: string | null
          health_limitations?: string | null
          id: string
          last_name?: string | null
          photo_url?: string | null
          progress_report_cache?: string | null
          progress_report_hash?: string | null
          telegram_id?: number | null
          training_location?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          available_minutes?: number | null
          birth_year?: number | null
          created_at?: string
          equipment?: string | null
          first_name?: string | null
          fitness_goal?: string | null
          fitness_level?: string | null
          gender?: string | null
          health_limitations?: string | null
          id?: string
          last_name?: string | null
          photo_url?: string | null
          progress_report_cache?: string | null
          progress_report_hash?: string | null
          telegram_id?: number | null
          training_location?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_type: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_type: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_type?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          cache_horoscope: Json | null
          cache_premiers: Json | null
          cache_tarot: Json | null
          cache_weather: Json | null
          cache_weather_v2: Json | null
          created_at: string | null
          first_name: string
          profile: string | null
          summary: string | null
          user_id: number
          web_search_enabled: boolean
          zodiac: string | null
        }
        Insert: {
          cache_horoscope?: Json | null
          cache_premiers?: Json | null
          cache_tarot?: Json | null
          cache_weather?: Json | null
          cache_weather_v2?: Json | null
          created_at?: string | null
          first_name: string
          profile?: string | null
          summary?: string | null
          user_id: number
          web_search_enabled?: boolean
          zodiac?: string | null
        }
        Update: {
          cache_horoscope?: Json | null
          cache_premiers?: Json | null
          cache_tarot?: Json | null
          cache_weather?: Json | null
          cache_weather_v2?: Json | null
          created_at?: string | null
          first_name?: string
          profile?: string | null
          summary?: string | null
          user_id?: number
          web_search_enabled?: boolean
          zodiac?: string | null
        }
        Relationships: []
      }
      workout_plans: {
        Row: {
          created_at: string
          exercise_id: string | null
          id: string
          name: string
          plan_date: string
          reps: number
          rest_time_seconds: number | null
          sets: number
          sort_order: number
          target_muscle_group: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          id?: string
          name: string
          plan_date: string
          reps: number
          rest_time_seconds?: number | null
          sets: number
          sort_order?: number
          target_muscle_group?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          id?: string
          name?: string
          plan_date?: string
          reps?: number
          rest_time_seconds?: number | null
          sets?: number
          sort_order?: number
          target_muscle_group?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          duration_seconds: number
          finished_at: string
          id: string
          plan_date: string
          user_id: string
        }
        Insert: {
          duration_seconds: number
          finished_at?: string
          id?: string
          plan_date: string
          user_id: string
        }
        Update: {
          duration_seconds?: number
          finished_at?: string
          id?: string
          plan_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
