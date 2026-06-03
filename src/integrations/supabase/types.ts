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
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: string
          props: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          props?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          props?: Json
          user_id?: string | null
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
      booking_messages: {
        Row: {
          body: string
          booking_id: string
          created_at: string
          id: string
          notification_sent_at: string | null
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          body: string
          booking_id: string
          created_at?: string
          id?: string
          notification_sent_at?: string | null
          read_at?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          body?: string
          booking_id?: string
          created_at?: string
          id?: string
          notification_sent_at?: string | null
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          cancellation_reason: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_telegram_chat_id: number | null
          customer_telegram_user_id: number | null
          customer_telegram_username: string | null
          date: string
          duration_minutes: number
          experience: string
          guests: number
          guide_id: string
          id: string
          locale: string
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
          cancellation_reason?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_telegram_chat_id?: number | null
          customer_telegram_user_id?: number | null
          customer_telegram_username?: string | null
          date: string
          duration_minutes?: number
          experience: string
          guests?: number
          guide_id: string
          id?: string
          locale?: string
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
          cancellation_reason?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_telegram_chat_id?: number | null
          customer_telegram_user_id?: number | null
          customer_telegram_username?: string | null
          date?: string
          duration_minutes?: number
          experience?: string
          guests?: number
          guide_id?: string
          id?: string
          locale?: string
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          page: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          page?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          page?: string
          user_id?: string | null
        }
        Relationships: []
      }
      guide_applications: {
        Row: {
          about: string
          category_ids: string[]
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
          category_ids?: string[]
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
          category_ids?: string[]
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
      guide_posts: {
        Row: {
          caption: string
          created_at: string
          guide_id: string
          id: string
          platform: string
          posted_at: string | null
          sort_order: number
          thumbnail_url: string | null
          updated_at: string
          url: string
          visible: boolean
        }
        Insert: {
          caption?: string
          created_at?: string
          guide_id: string
          id?: string
          platform: string
          posted_at?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          updated_at?: string
          url: string
          visible?: boolean
        }
        Update: {
          caption?: string
          created_at?: string
          guide_id?: string
          id?: string
          platform?: string
          posted_at?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          updated_at?: string
          url?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "guide_posts_guide_id_fkey"
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
          locale: string
          name: string
          photo_url: string | null
          price_per_day: number
          rating: number
          referral_code: string | null
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
          locale?: string
          name: string
          photo_url?: string | null
          price_per_day?: number
          rating?: number
          referral_code?: string | null
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
          locale?: string
          name?: string
          photo_url?: string | null
          price_per_day?: number
          rating?: number
          referral_code?: string | null
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
      newsletter_subscribers: {
        Row: {
          confirmed_at: string
          created_at: string
          email: string
          id: string
          last_sent_at: string | null
          locale: string
          source: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          confirmed_at?: string
          created_at?: string
          email: string
          id?: string
          last_sent_at?: string | null
          locale?: string
          source?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          confirmed_at?: string
          created_at?: string
          email?: string
          id?: string
          last_sent_at?: string | null
          locale?: string
          source?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      place_guides: {
        Row: {
          guide_id: string
          place_id: string
        }
        Insert: {
          guide_id: string
          place_id: string
        }
        Update: {
          guide_id?: string
          place_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_guides_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_guides_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      place_suggestions: {
        Row: {
          category: string
          city_id: string | null
          city_name: string
          created_at: string
          description: string
          id: string
          name: string
          raw_query: string
          source_url: string
          status: string
        }
        Insert: {
          category?: string
          city_id?: string | null
          city_name?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          raw_query?: string
          source_url?: string
          status?: string
        }
        Update: {
          category?: string
          city_id?: string | null
          city_name?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          raw_query?: string
          source_url?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_suggestions_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string
          body_md: string
          category: string
          city_id: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          photo_url: string | null
          published: boolean
          short_description: string
          slug: string
          sort_order: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          address?: string
          body_md?: string
          category?: string
          city_id: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          photo_url?: string | null
          published?: boolean
          short_description?: string
          slug: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          address?: string
          body_md?: string
          category?: string
          city_id?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          photo_url?: string | null
          published?: boolean
          short_description?: string
          slug?: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "places_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_clicks: {
        Row: {
          created_at: string
          guide_id: string
          id: string
          referral_code: string
          source: string
          user_agent: string
        }
        Insert: {
          created_at?: string
          guide_id: string
          id?: string
          referral_code: string
          source?: string
          user_agent?: string
        }
        Update: {
          created_at?: string
          guide_id?: string
          id?: string
          referral_code?: string
          source?: string
          user_agent?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string
          created_at: string
          guide_id: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          comment?: string
          created_at?: string
          guide_id: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          comment?: string
          created_at?: string
          guide_id?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      spotlights: {
        Row: {
          created_at: string
          description_en: string
          description_ru: string
          description_uz: string
          expires_at: string | null
          href: string
          id: string
          image_url: string | null
          is_active: boolean
          kind: string
          published_at: string
          sort_order: number
          title_en: string
          title_ru: string
          title_uz: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string
          description_ru?: string
          description_uz?: string
          expires_at?: string | null
          href?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          published_at?: string
          sort_order?: number
          title_en?: string
          title_ru?: string
          title_uz?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string
          description_ru?: string
          description_uz?: string
          expires_at?: string | null
          href?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          published_at?: string
          sort_order?: number
          title_en?: string
          title_ru?: string
          title_uz?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      telegram_accounts: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          linked_at: string
          photo_url: string | null
          telegram_chat_id: number | null
          telegram_user_id: number
          telegram_username: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linked_at?: string
          photo_url?: string | null
          telegram_chat_id?: number | null
          telegram_user_id: number
          telegram_username?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linked_at?: string
          photo_url?: string | null
          telegram_chat_id?: number | null
          telegram_user_id?: number
          telegram_username?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tour_categories: {
        Row: {
          category_id: string
          tour_id: string
        }
        Insert: {
          category_id: string
          tour_id: string
        }
        Update: {
          category_id?: string
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_categories_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_guides: {
        Row: {
          guide_id: string
          tour_id: string
        }
        Insert: {
          guide_id: string
          tour_id: string
        }
        Update: {
          guide_id?: string
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_guides_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_guides_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          city_id: string
          cover_url: string | null
          created_at: string
          description_md: string
          duration_hours: number
          highlights: string[]
          id: string
          included: string[]
          not_included: string[]
          price_from: number
          published: boolean
          short_description: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          city_id: string
          cover_url?: string | null
          created_at?: string
          description_md?: string
          duration_hours?: number
          highlights?: string[]
          id?: string
          included?: string[]
          not_included?: string[]
          price_from?: number
          published?: boolean
          short_description?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          city_id?: string
          cover_url?: string | null
          created_at?: string
          description_md?: string
          duration_hours?: number
          highlights?: string[]
          id?: string
          included?: string[]
          not_included?: string[]
          price_from?: number
          published?: boolean
          short_description?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tours_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_guide_rating: {
        Args: { _guide_id: string }
        Returns: undefined
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
