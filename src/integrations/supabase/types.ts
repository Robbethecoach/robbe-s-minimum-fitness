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
    PostgrestVersion: "14.18"
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
      conditioning_tests: {
        Row: {
          avg_hr: number | null
          created_at: string
          distance_km: number | null
          duration_sec: number | null
          finish_hr: number | null
          hr_after_1min: number | null
          id: string
          test_type: string
          tested_on: string
          user_id: string
        }
        Insert: {
          avg_hr?: number | null
          created_at?: string
          distance_km?: number | null
          duration_sec?: number | null
          finish_hr?: number | null
          hr_after_1min?: number | null
          id?: string
          test_type: string
          tested_on?: string
          user_id: string
        }
        Update: {
          avg_hr?: number | null
          created_at?: string
          distance_km?: number | null
          duration_sec?: number | null
          finish_hr?: number | null
          hr_after_1min?: number | null
          id?: string
          test_type?: string
          tested_on?: string
          user_id?: string
        }
        Relationships: []
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
      escalation_flags: {
        Row: {
          category: string
          created_at: string
          detail: string | null
          id: string
          refer_to: string | null
          resolved_at: string | null
          source: string
          status: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          detail?: string | null
          id?: string
          refer_to?: string | null
          resolved_at?: string | null
          source: string
          status?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          detail?: string | null
          id?: string
          refer_to?: string | null
          resolved_at?: string | null
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_sets: {
        Row: {
          completion_id: string
          exercise_id: string
          id: string
          is_calibration: boolean
          logged_at: string
          reps: number | null
          rir: number | null
          set_number: number
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          completion_id: string
          exercise_id: string
          id?: string
          is_calibration?: boolean
          logged_at?: string
          reps?: number | null
          rir?: number | null
          set_number: number
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          completion_id?: string
          exercise_id?: string
          id?: string
          is_calibration?: boolean
          logged_at?: string
          reps?: number | null
          rir?: number | null
          set_number?: number
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "user_workout_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          alternative_coaching_note: string | null
          alternative_name: string | null
          alternative_youtube_url: string | null
          coaching_note: string | null
          created_at: string
          focus: string
          id: string
          is_main_lift: boolean
          name: string
          order_index: number
          pattern: string | null
          reps: string
          sets: number
          type: string
          usable_in_strength_block: boolean
          workout_block_id: string
          youtube_url: string | null
        }
        Insert: {
          alternative_coaching_note?: string | null
          alternative_name?: string | null
          alternative_youtube_url?: string | null
          coaching_note?: string | null
          created_at?: string
          focus?: string
          id?: string
          is_main_lift?: boolean
          name: string
          order_index?: number
          pattern?: string | null
          reps?: string
          sets?: number
          type?: string
          usable_in_strength_block?: boolean
          workout_block_id: string
          youtube_url?: string | null
        }
        Update: {
          alternative_coaching_note?: string | null
          alternative_name?: string | null
          alternative_youtube_url?: string | null
          coaching_note?: string | null
          created_at?: string
          focus?: string
          id?: string
          is_main_lift?: boolean
          name?: string
          order_index?: number
          pattern?: string | null
          reps?: string
          sets?: number
          type?: string
          usable_in_strength_block?: boolean
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
      member_exercise_overrides: {
        Row: {
          exercise_id: string
          id: string
          paused: boolean
          reps: string | null
          sets: number | null
          source: string
          target_load_kg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          paused?: boolean
          reps?: string | null
          sets?: number | null
          source?: string
          target_load_kg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          paused?: boolean
          reps?: string | null
          sets?: number | null
          source?: string
          target_load_kg?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_exercise_overrides_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      member_plans: {
        Row: {
          block_number: number
          block_start_date: string
          created_at: string
          deload_week: number
          id: string
          season_number: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          block_number?: number
          block_start_date?: string
          created_at?: string
          deload_week?: number
          id?: string
          season_number?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          block_number?: number
          block_start_date?: string
          created_at?: string
          deload_week?: number
          id?: string
          season_number?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      method_rules: {
        Row: {
          action: Json
          active: boolean
          condition: Json
          created_at: string
          description: string
          id: string
          name: string
          priority: number
          step: string
          updated_at: string
        }
        Insert: {
          action?: Json
          active?: boolean
          condition?: Json
          created_at?: string
          description: string
          id?: string
          name: string
          priority?: number
          step: string
          updated_at?: string
        }
        Update: {
          action?: Json
          active?: boolean
          condition?: Json
          created_at?: string
          description?: string
          id?: string
          name?: string
          priority?: number
          step?: string
          updated_at?: string
        }
        Relationships: []
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
      robbe_answers: {
        Row: {
          answer: string
          created_at: string
          id: string
          question_id: string
          rule_id: string | null
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question_id: string
          rule_id?: string | null
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question_id?: string
          rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "robbe_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "robbe_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "robbe_answers_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "method_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      robbe_questions: {
        Row: {
          context: string | null
          created_at: string
          id: string
          question: string
          source: string
          status: string
          step: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          question: string
          source?: string
          status?: string
          step: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          question?: string
          source?: string
          status?: string
          step?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          created_at: string
          decided_at: string | null
          exercise_id: string | null
          id: string
          payload: Json
          reason: string
          rule_id: string | null
          source: string
          status: string
          type: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          exercise_id?: string | null
          id?: string
          payload?: Json
          reason: string
          rule_id?: string | null
          source?: string
          status?: string
          type: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          exercise_id?: string | null
          id?: string
          payload?: Json
          reason?: string
          rule_id?: string | null
          source?: string
          status?: string
          type?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "method_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          conditioning_goal: string | null
          created_at: string
          equipment_access: string
          experience_level: string
          focus_conditioning: number
          focus_mobility: number
          focus_strength: number
          goal: string | null
          id: string
          onboarding_completed: boolean
          preferred_days: string[]
          training_start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conditioning_goal?: string | null
          created_at?: string
          equipment_access?: string
          experience_level?: string
          focus_conditioning?: number
          focus_mobility?: number
          focus_strength?: number
          goal?: string | null
          id?: string
          onboarding_completed?: boolean
          preferred_days?: string[]
          training_start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conditioning_goal?: string | null
          created_at?: string
          equipment_access?: string
          experience_level?: string
          focus_conditioning?: number
          focus_mobility?: number
          focus_strength?: number
          goal?: string | null
          id?: string
          onboarding_completed?: boolean
          preferred_days?: string[]
          training_start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
          pain: boolean
          pain_detail: string | null
          sleep_quality: number
          stress_level: number | null
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
          workouts_completed: number
        }
        Insert: {
          created_at?: string
          energy_levels?: number
          hard_this_week?: string | null
          id?: string
          nutrition_adherence?: number
          pain?: boolean
          pain_detail?: string | null
          sleep_quality?: number
          stress_level?: number | null
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
          workouts_completed?: number
        }
        Update: {
          created_at?: string
          energy_levels?: number
          hard_this_week?: string | null
          id?: string
          nutrition_adherence?: number
          pain?: boolean
          pain_detail?: string | null
          sleep_quality?: number
          stress_level?: number | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
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
      decide_suggestion: {
        Args: { _decision: string; _suggestion_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
