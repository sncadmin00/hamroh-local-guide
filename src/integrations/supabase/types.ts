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
      ai_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      article_cities: {
        Row: {
          article_id: string
          city_id: string
        }
        Insert: {
          article_id: string
          city_id: string
        }
        Update: {
          article_id?: string
          city_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_cities_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_cities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          body_md: string
          cover_url: string | null
          created_at: string
          excerpt: string
          id: string
          published: boolean
          published_at: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body_md?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          date: string
          duration_minutes: number
          experience: string
          guests: number
          guide_id: string
          id: string
          notes: string
          slot_id: string | null
          source: string
          start_time: string | null
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          date: string
          duration_minutes?: number
          experience: string
          guests?: number
          guide_id: string
          id?: string
          notes?: string
          slot_id?: string | null
          source?: string
          start_time?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          date?: string
          duration_minutes?: number
          experience?: string
          guests?: number
          guide_id?: string
          id?: string
          notes?: string
          slot_id?: string | null
          source?: string
          start_time?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      guide_applications: {
        Row: {
          about: string
          city: string
          created_at: string
          email: string
          experience_years: number
          full_name: string
          id: string
          languages: string[]
          phone: string
          photo_urls: string[]
          portrait_url: string | null
          specialization: string
          status: string
          updated_at: string
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          about?: string
          city: string
          created_at?: string
          email: string
          experience_years?: number
          full_name: string
          id?: string
          languages?: string[]
          phone?: string
          photo_urls?: string[]
          portrait_url?: string | null
          specialization?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          about?: string
          city?: string
          created_at?: string
          email?: string
          experience_years?: number
          full_name?: string
          id?: string
          languages?: string[]
          phone?: string
          photo_urls?: string[]
          portrait_url?: string | null
          specialization?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      guide_availability_slots: {
        Row: {
          booking_id: string | null
          created_at: string
          date: string
          duration_minutes: number
          guide_id: string
          id: string
          is_booked: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          date: string
          duration_minutes?: number
          guide_id: string
          id?: string
          is_booked?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          date?: string
          duration_minutes?: number
          guide_id?: string
          id?: string
          is_booked?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      guide_categories: {
        Row: {
          category_id: string
          guide_id: string
        }
        Insert: {
          category_id: string
          guide_id: string
        }
        Update: {
          category_id?: string
          guide_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_categories_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_experiences: {
        Row: {
          created_at: string
          duration: string
          guide_id: string
          id: string
          price: number
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          duration: string
          guide_id: string
          id?: string
          price?: number
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          duration?: string
          guide_id?: string
          id?: string
          price?: number
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_experiences_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          bio: string
          city_id: string
          created_at: string
          id: string
          instant_book: boolean
          languages: string[]
          name: string
          photo_url: string | null
          price_per_day: number
          rating: number
          reviews: number
          slug: string
          sort_order: number
          specialties: string[]
          tagline: string
          updated_at: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          bio?: string
          city_id: string
          created_at?: string
          id?: string
          instant_book?: boolean
          languages?: string[]
          name: string
          photo_url?: string | null
          price_per_day?: number
          rating?: number
          reviews?: number
          slug: string
          sort_order?: number
          specialties?: string[]
          tagline?: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          bio?: string
          city_id?: string
          created_at?: string
          id?: string
          instant_book?: boolean
          languages?: string[]
          name?: string
          photo_url?: string | null
          price_per_day?: number
          rating?: number
          reviews?: number
          slug?: string
          sort_order?: number
          specialties?: string[]
          tagline?: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "guides_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      social_embed_cities: {
        Row: {
          city_id: string
          embed_id: string
        }
        Insert: {
          city_id: string
          embed_id: string
        }
        Update: {
          city_id?: string
          embed_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_embed_cities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_embed_cities_embed_id_fkey"
            columns: ["embed_id"]
            isOneToOne: false
            referencedRelation: "social_embeds"
            referencedColumns: ["id"]
          },
        ]
      }
      social_embeds: {
        Row: {
          caption: string
          created_at: string
          id: string
          platform: string
          sort_order: number
          url: string
          visible: boolean
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          platform: string
          sort_order?: number
          url: string
          visible?: boolean
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          platform?: string
          sort_order?: number
          url?: string
          visible?: boolean
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_guide_owner: {
        Args: { _guide_id: string; _user_id: string }
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
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
