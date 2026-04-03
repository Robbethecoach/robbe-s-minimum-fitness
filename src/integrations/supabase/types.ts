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
      accessory_library: {
        Row: {
          coaching_note: string | null
          created_at: string
          id: string
          name: string
          target_area: string
          youtube_url: string | null
        }
        Insert: {
          coaching_note?: string | null
          created_at?: string
          id?: string
          name: string
          target_area?: string
          youtube_url?: string | null
        }
        Update: {
          coaching_note?: string | null
          created_at?: string
          id?: string
          name?: string
          target_area?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      chain_tasks: {
        Row: {
          created_at: string
          day_date: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          day_date: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          day_date?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      chain_user_progress: {
        Row: {
          created_at: string
          day_date: string
          id: string
          status: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_date: string
          id?: string
          status?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_date?: string
          id?: string
          status?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_user_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "chain_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      content_library: {
        Row: {
          body: string
          created_at: string
          description: string
          id: string
          pillar: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          description: string
          id?: string
          pillar: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          description?: string
          id?: string
          pillar?: string
          title?: string
        }
        Relationships: []
      }
      daily_thoughts: {
        Row: {
          attribution: string | null
          caption: string | null
          content: string | null
          content_type: string
          created_at: string
          id: string
          image_url: string | null
          layout_order: string | null
          publish_date: string
        }
        Insert: {
          attribution?: string | null
          caption?: string | null
          content?: string | null
          content_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          layout_order?: string | null
          publish_date: string
        }
        Update: {
          attribution?: string | null
          caption?: string | null
          content?: string | null
          content_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          layout_order?: string | null
          publish_date?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          alternative_coaching_note: string | null
          alternative_name: string | null
          alternative_youtube_url: string | null
          coaching_note: string | null
          created_at: string
          id: string
          name: string
          order_index: number
          reps: string
          sets: number
          type: string
          workout_block_id: string
          youtube_url: string | null
        }
        Insert: {
          alternative_coaching_note?: string | null
          alternative_name?: string | null
          alternative_youtube_url?: string | null
          coaching_note?: string | null
          created_at?: string
          id?: string
          name: string
          order_index?: number
          reps?: string
          sets?: number
          type?: string
          workout_block_id: string
          youtube_url?: string | null
        }
        Update: {
          alternative_coaching_note?: string | null
          alternative_name?: string | null
          alternative_youtube_url?: string | null
          coaching_note?: string | null
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          reps?: string
          sets?: number
          type?: string
          workout_block_id?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_workout_block_id_fkey"
            columns: ["workout_block_id"]
            isOneToOne: false
            referencedRelation: "workout_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      mobility_flows: {
        Row: {
          created_at: string
          description: string
          duration_minutes: number
          id: string
          tag: string
          title: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          tag?: string
          title: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          tag?: string
          title?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      recipes: {
        Row: {
          cook_time: number | null
          created_at: string
          description: string
          id: string
          image_url: string | null
          ingredients: string
          instructions: string
          prep_time: number | null
          servings: number | null
          title: string
          week_label: string | null
        }
        Insert: {
          cook_time?: number | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          ingredients?: string
          instructions?: string
          prep_time?: number | null
          servings?: number | null
          title: string
          week_label?: string | null
        }
        Update: {
          cook_time?: number | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          ingredients?: string
          instructions?: string
          prep_time?: number | null
          servings?: number | null
          title?: string
          week_label?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          equipment_access: string
          experience_level: string
          id: string
          onboarding_completed: boolean
          preferred_days: string[]
          training_start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          equipment_access?: string
          experience_level?: string
          id?: string
          onboarding_completed?: boolean
          preferred_days?: string[]
          training_start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          equipment_access?: string
          experience_level?: string
          id?: string
          onboarding_completed?: boolean
          preferred_days?: string[]
          training_start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_workout_completions: {
        Row: {
          completed_at: string
          day_date: string
          id: string
          user_id: string
          week_number: number
          workout_block_id: string
        }
        Insert: {
          completed_at?: string
          day_date: string
          id?: string
          user_id: string
          week_number: number
          workout_block_id: string
        }
        Update: {
          completed_at?: string
          day_date?: string
          id?: string
          user_id?: string
          week_number?: number
          workout_block_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_completions_workout_block_id_fkey"
            columns: ["workout_block_id"]
            isOneToOne: false
            referencedRelation: "workout_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_checkins: {
        Row: {
          created_at: string
          energy_levels: number
          hard_this_week: string | null
          id: string
          nutrition_adherence: number
          sleep_quality: number
          user_id: string
          workouts_completed: number
        }
        Insert: {
          created_at?: string
          energy_levels?: number
          hard_this_week?: string | null
          id?: string
          nutrition_adherence?: number
          sleep_quality?: number
          user_id: string
          workouts_completed?: number
        }
        Update: {
          created_at?: string
          energy_levels?: number
          hard_this_week?: string | null
          id?: string
          nutrition_adherence?: number
          sleep_quality?: number
          user_id?: string
          workouts_completed?: number
        }
        Relationships: []
      }
      workout_blocks: {
        Row: {
          created_at: string
          day_type: string
          id: string
          week_number: number
          workout_name: string
        }
        Insert: {
          created_at?: string
          day_type: string
          id?: string
          week_number: number
          workout_name: string
        }
        Update: {
          created_at?: string
          day_type?: string
          id?: string
          week_number?: number
          workout_name?: string
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
