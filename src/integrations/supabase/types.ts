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
      admin_reels: {
        Row: {
          caption: string
          created_at: string
          id: string
          posted_at: string | null
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
          visible: boolean
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          posted_at?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url: string
          visible?: boolean
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          posted_at?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
          visible?: boolean
        }
        Relationships: []
      }
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
      ai_usage_log: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      article_chunks: {
        Row: {
          article_id: string
          chunk_index: number
          content: string
          created_at: string
          embedding: string
          id: string
          model: string
        }
        Insert: {
          article_id: string
          chunk_index: number
          content: string
          created_at?: string
          embedding: string
          id?: string
          model?: string
        }
        Update: {
          article_id?: string
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          model?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_chunks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
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
      booking_google_events: {
        Row: {
          booking_id: string
          created_at: string
          google_event_id: string
          guide_id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          google_event_id: string
          guide_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          google_event_id?: string
          guide_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_google_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_google_events_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
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
          adults: number
          cancellation_reason: string | null
          children: number
          commission_amount: number
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_telegram_chat_id: number | null
          customer_telegram_user_id: number | null
          customer_telegram_username: string | null
          date: string
          duration_minutes: number
          experience: string
          expired_at: string | null
          expires_at: string | null
          group_category: string | null
          guests: number
          guide_id: string
          guide_payout_amount: number
          id: string
          language: string | null
          locale: string
          notes: string
          offer_accepted_at: string | null
          offer_version: string | null
          payment_method: string
          proposed_at: string | null
          proposed_date: string | null
          proposed_note: string | null
          proposed_time: string | null
          service_fee_amount: number
          service_fee_paid_at: string | null
          service_fee_status: string
          slot_id: string | null
          source: string
          start_time: string | null
          statement_id: string | null
          status: string
          total: number
          tour_id: string | null
          tour_price: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          adults?: number
          cancellation_reason?: string | null
          children?: number
          commission_amount?: number
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_telegram_chat_id?: number | null
          customer_telegram_user_id?: number | null
          customer_telegram_username?: string | null
          date: string
          duration_minutes?: number
          experience: string
          expired_at?: string | null
          expires_at?: string | null
          group_category?: string | null
          guests?: number
          guide_id: string
          guide_payout_amount?: number
          id?: string
          language?: string | null
          locale?: string
          notes?: string
          offer_accepted_at?: string | null
          offer_version?: string | null
          payment_method?: string
          proposed_at?: string | null
          proposed_date?: string | null
          proposed_note?: string | null
          proposed_time?: string | null
          service_fee_amount?: number
          service_fee_paid_at?: string | null
          service_fee_status?: string
          slot_id?: string | null
          source?: string
          start_time?: string | null
          statement_id?: string | null
          status?: string
          total?: number
          tour_id?: string | null
          tour_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          adults?: number
          cancellation_reason?: string | null
          children?: number
          commission_amount?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_telegram_chat_id?: number | null
          customer_telegram_user_id?: number | null
          customer_telegram_username?: string | null
          date?: string
          duration_minutes?: number
          experience?: string
          expired_at?: string | null
          expires_at?: string | null
          group_category?: string | null
          guests?: number
          guide_id?: string
          guide_payout_amount?: number
          id?: string
          language?: string | null
          locale?: string
          notes?: string
          offer_accepted_at?: string | null
          offer_version?: string | null
          payment_method?: string
          proposed_at?: string | null
          proposed_date?: string | null
          proposed_note?: string | null
          proposed_time?: string | null
          service_fee_amount?: number
          service_fee_paid_at?: string | null
          service_fee_status?: string
          slot_id?: string | null
          source?: string
          start_time?: string | null
          statement_id?: string | null
          status?: string
          total?: number
          tour_id?: string | null
          tour_price?: number | null
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
          {
            foreignKeyName: "bookings_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "monthly_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          booking_id: string | null
          color: string
          created_at: string
          ends_at: string
          google_event_id: string | null
          guide_id: string
          id: string
          location: string
          notes: string
          source: string
          starts_at: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          booking_id?: string | null
          color?: string
          created_at?: string
          ends_at: string
          google_event_id?: string | null
          guide_id: string
          id?: string
          location?: string
          notes?: string
          source?: string
          starts_at: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          booking_id?: string | null
          color?: string
          created_at?: string
          ends_at?: string
          google_event_id?: string | null
          guide_id?: string
          id?: string
          location?: string
          notes?: string
          source?: string
          starts_at?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_guide_id_fkey"
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
          approved: boolean
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
          approved?: boolean
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
          approved?: boolean
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
      city_suggestions: {
        Row: {
          admin_note: string | null
          created_at: string
          created_city_id: string | null
          guide_id: string | null
          id: string
          name: string
          note: string | null
          region: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          created_city_id?: string | null
          guide_id?: string | null
          id?: string
          name: string
          note?: string | null
          region?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          created_city_id?: string | null
          guide_id?: string | null
          id?: string
          name?: string
          note?: string | null
          region?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_suggestions_created_city_id_fkey"
            columns: ["created_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_suggestions_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
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
      guide_ai_threads: {
        Row: {
          created_at: string
          guide_id: string
          id: string
          messages: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          guide_id: string
          id?: string
          messages?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          guide_id?: string
          id?: string
          messages?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_ai_threads_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: true
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_applications: {
        Row: {
          about: string
          category_ids: string[]
          certificate_confirmed: boolean
          certificate_url: string | null
          city: string
          city_ids: string[]
          created_at: string
          email: string
          experience_years: number
          full_name: string
          has_certificate: boolean
          has_transport: boolean
          id: string
          id_document_url: string | null
          language_tests: Json
          languages: string[]
          phone: string
          photo_urls: string[]
          portrait_url: string | null
          proposed_cities: string[]
          specialization: string
          status: string
          tax_id: string | null
          telegram: string
          transport_seats: number | null
          updated_at: string
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          about?: string
          category_ids?: string[]
          certificate_confirmed?: boolean
          certificate_url?: string | null
          city: string
          city_ids?: string[]
          created_at?: string
          email: string
          experience_years?: number
          full_name: string
          has_certificate?: boolean
          has_transport?: boolean
          id?: string
          id_document_url?: string | null
          language_tests?: Json
          languages?: string[]
          phone?: string
          photo_urls?: string[]
          portrait_url?: string | null
          proposed_cities?: string[]
          specialization?: string
          status?: string
          tax_id?: string | null
          telegram?: string
          transport_seats?: number | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          about?: string
          category_ids?: string[]
          certificate_confirmed?: boolean
          certificate_url?: string | null
          city?: string
          city_ids?: string[]
          created_at?: string
          email?: string
          experience_years?: number
          full_name?: string
          has_certificate?: boolean
          has_transport?: boolean
          id?: string
          id_document_url?: string | null
          language_tests?: Json
          languages?: string[]
          phone?: string
          photo_urls?: string[]
          portrait_url?: string | null
          proposed_cities?: string[]
          specialization?: string
          status?: string
          tax_id?: string | null
          telegram?: string
          transport_seats?: number | null
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
      guide_client_notes: {
        Row: {
          client_email: string | null
          client_name: string
          client_user_id: string | null
          created_at: string
          guide_id: string
          id: string
          last_tour_at: string | null
          notes: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_name?: string
          client_user_id?: string | null
          created_at?: string
          guide_id: string
          id?: string
          last_tour_at?: string | null
          notes?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_user_id?: string | null
          created_at?: string
          guide_id?: string
          id?: string
          last_tour_at?: string | null
          notes?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_client_notes_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_google_calendar: {
        Row: {
          access_token: string
          calendar_id: string
          created_at: string
          expires_at: string
          google_email: string | null
          guide_id: string
          id: string
          last_synced_at: string | null
          refresh_token: string
          sync_token: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          calendar_id?: string
          created_at?: string
          expires_at: string
          google_email?: string | null
          guide_id: string
          id?: string
          last_synced_at?: string | null
          refresh_token: string
          sync_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          calendar_id?: string
          created_at?: string
          expires_at?: string
          google_email?: string | null
          guide_id?: string
          id?: string
          last_synced_at?: string | null
          refresh_token?: string
          sync_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_google_calendar_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: true
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_invitations: {
        Row: {
          application_id: string | null
          city: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          notes: string | null
          opened_at: string | null
          registered_at: string | null
          sent_at: string | null
          sent_by: string | null
          source: string
          source_url: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          city?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          notes?: string | null
          opened_at?: string | null
          registered_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          source?: string
          source_url?: string | null
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          notes?: string | null
          opened_at?: string | null
          registered_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          source?: string
          source_url?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_invitations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "guide_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_offer_acceptances: {
        Row: {
          accepted_at: string
          guide_id: string
          id: string
          ip: string | null
          user_agent: string | null
          version: string
        }
        Insert: {
          accepted_at?: string
          guide_id: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          version: string
        }
        Update: {
          accepted_at?: string
          guide_id?: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_offer_acceptances_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_offer_acceptances_version_fkey"
            columns: ["version"]
            isOneToOne: false
            referencedRelation: "legal_offers"
            referencedColumns: ["version"]
          },
        ]
      }
      guide_posts: {
        Row: {
          caption: string
          created_at: string
          duration_seconds: number | null
          featured_on_home: boolean
          guide_id: string
          height: number | null
          id: string
          media_type: Database["public"]["Enums"]["post_media_type"]
          size_bytes: number | null
          sort_order: number
          thumbnail_url: string | null
          updated_at: string
          video_path: string
          visible: boolean
          width: number | null
        }
        Insert: {
          caption?: string
          created_at?: string
          duration_seconds?: number | null
          featured_on_home?: boolean
          guide_id: string
          height?: number | null
          id?: string
          media_type?: Database["public"]["Enums"]["post_media_type"]
          size_bytes?: number | null
          sort_order?: number
          thumbnail_url?: string | null
          updated_at?: string
          video_path: string
          visible?: boolean
          width?: number | null
        }
        Update: {
          caption?: string
          created_at?: string
          duration_seconds?: number | null
          featured_on_home?: boolean
          guide_id?: string
          height?: number | null
          id?: string
          media_type?: Database["public"]["Enums"]["post_media_type"]
          size_bytes?: number | null
          sort_order?: number
          thumbnail_url?: string | null
          updated_at?: string
          video_path?: string
          visible?: boolean
          width?: number | null
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
      guide_time_blocks: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          guide_id: string
          id: string
          reason: string | null
          source: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          guide_id: string
          id?: string
          reason?: string | null
          source?: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          guide_id?: string
          id?: string
          reason?: string | null
          source?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_time_blocks_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          avg_response_minutes: number | null
          bio: string
          buffer_minutes: number
          city_id: string
          completed_tours_count: number
          cover_url: string | null
          created_at: string
          extra_city_ids: string[]
          has_transport: boolean
          id: string
          identity_passport_url: string | null
          identity_phone: string | null
          identity_rejected_reason: string | null
          identity_submitted_at: string | null
          identity_verified: boolean
          instant_book: boolean
          intro_video_rejected_reason: string | null
          intro_video_submitted_at: string | null
          intro_video_url: string | null
          intro_video_verified: boolean
          languages: string[]
          license_url: string | null
          licensed: boolean
          licensed_at: string | null
          locale: string
          name: string
          notification_email: string | null
          photo_url: string | null
          price_per_day: number
          rating: number
          referral_code: string | null
          reviews: number
          slug: string
          sort_order: number
          specialties: string[]
          tagline: string
          tax_id: string | null
          tax_status: string
          transport_seats: number | null
          updated_at: string
          user_id: string | null
          verified: boolean
          verified_languages: Json
        }
        Insert: {
          avg_response_minutes?: number | null
          bio?: string
          buffer_minutes?: number
          city_id: string
          completed_tours_count?: number
          cover_url?: string | null
          created_at?: string
          extra_city_ids?: string[]
          has_transport?: boolean
          id?: string
          identity_passport_url?: string | null
          identity_phone?: string | null
          identity_rejected_reason?: string | null
          identity_submitted_at?: string | null
          identity_verified?: boolean
          instant_book?: boolean
          intro_video_rejected_reason?: string | null
          intro_video_submitted_at?: string | null
          intro_video_url?: string | null
          intro_video_verified?: boolean
          languages?: string[]
          license_url?: string | null
          licensed?: boolean
          licensed_at?: string | null
          locale?: string
          name: string
          notification_email?: string | null
          photo_url?: string | null
          price_per_day?: number
          rating?: number
          referral_code?: string | null
          reviews?: number
          slug: string
          sort_order?: number
          specialties?: string[]
          tagline?: string
          tax_id?: string | null
          tax_status?: string
          transport_seats?: number | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          verified_languages?: Json
        }
        Update: {
          avg_response_minutes?: number | null
          bio?: string
          buffer_minutes?: number
          city_id?: string
          completed_tours_count?: number
          cover_url?: string | null
          created_at?: string
          extra_city_ids?: string[]
          has_transport?: boolean
          id?: string
          identity_passport_url?: string | null
          identity_phone?: string | null
          identity_rejected_reason?: string | null
          identity_submitted_at?: string | null
          identity_verified?: boolean
          instant_book?: boolean
          intro_video_rejected_reason?: string | null
          intro_video_submitted_at?: string | null
          intro_video_url?: string | null
          intro_video_verified?: boolean
          languages?: string[]
          license_url?: string | null
          licensed?: boolean
          licensed_at?: string | null
          locale?: string
          name?: string
          notification_email?: string | null
          photo_url?: string | null
          price_per_day?: number
          rating?: number
          referral_code?: string | null
          reviews?: number
          slug?: string
          sort_order?: number
          specialties?: string[]
          tagline?: string
          tax_id?: string | null
          tax_status?: string
          transport_seats?: number | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          verified_languages?: Json
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
      languages: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      legal_offers: {
        Row: {
          content_en: string
          content_ru: string
          content_uz: string
          created_at: string
          is_current: boolean
          published_at: string
          version: string
        }
        Insert: {
          content_en: string
          content_ru: string
          content_uz: string
          created_at?: string
          is_current?: boolean
          published_at?: string
          version: string
        }
        Update: {
          content_en?: string
          content_ru?: string
          content_uz?: string
          created_at?: string
          is_current?: boolean
          published_at?: string
          version?: string
        }
        Relationships: []
      }
      monthly_statements: {
        Row: {
          cash_bookings_count: number
          cash_commission_to_us: number
          cash_revenue: number
          created_at: string
          direction: string
          due_date: string | null
          guide_id: string
          id: string
          net_amount: number
          notes: string | null
          online_bookings_count: number
          online_payout_to_guide: number
          online_revenue: number
          payment_method: string | null
          payment_reference: string | null
          pdf_url: string | null
          period_month: number
          period_year: number
          settled_at: string | null
          statement_number: string
          status: string
          updated_at: string
        }
        Insert: {
          cash_bookings_count?: number
          cash_commission_to_us?: number
          cash_revenue?: number
          created_at?: string
          direction: string
          due_date?: string | null
          guide_id: string
          id?: string
          net_amount?: number
          notes?: string | null
          online_bookings_count?: number
          online_payout_to_guide?: number
          online_revenue?: number
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          period_month: number
          period_year: number
          settled_at?: string | null
          statement_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          cash_bookings_count?: number
          cash_commission_to_us?: number
          cash_revenue?: number
          created_at?: string
          direction?: string
          due_date?: string | null
          guide_id?: string
          id?: string
          net_amount?: number
          notes?: string | null
          online_bookings_count?: number
          online_payout_to_guide?: number
          online_revenue?: number
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          period_month?: number
          period_year?: number
          settled_at?: string | null
          statement_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_statements_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
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
      notification_preferences: {
        Row: {
          bookings_email: boolean
          bookings_inapp: boolean
          bookings_push: boolean
          created_at: string
          marketing_push: boolean
          messages_email: boolean
          messages_inapp: boolean
          messages_push: boolean
          system_email: boolean
          system_inapp: boolean
          system_push: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          bookings_email?: boolean
          bookings_inapp?: boolean
          bookings_push?: boolean
          created_at?: string
          marketing_push?: boolean
          messages_email?: boolean
          messages_inapp?: boolean
          messages_push?: boolean
          system_email?: boolean
          system_inapp?: boolean
          system_push?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          bookings_email?: boolean
          bookings_inapp?: boolean
          bookings_push?: boolean
          created_at?: string
          marketing_push?: boolean
          messages_email?: boolean
          messages_inapp?: boolean
          messages_push?: boolean
          system_email?: boolean
          system_inapp?: boolean
          system_push?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          icon: string | null
          id: string
          link: string | null
          read: boolean
          read_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          icon?: string | null
          id?: string
          link?: string | null
          read?: boolean
          read_at?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          icon?: string | null
          id?: string
          link?: string | null
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payout_items: {
        Row: {
          booking_id: string
          commission_amount: number
          created_at: string
          gross_amount: number
          id: string
          net_amount: number
          payout_id: string
        }
        Insert: {
          booking_id: string
          commission_amount?: number
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          payout_id: string
        }
        Update: {
          booking_id?: string
          commission_amount?: number
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          guide_id: string
          id: string
          method: string
          notes: string | null
          paid_at: string | null
          payout_number: string
          reference: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          guide_id: string
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string | null
          payout_number: string
          reference?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          guide_id?: string
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string | null
          payout_number?: string
          reference?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
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
          contact_email: string
          created_at: string
          description: string
          guide_id: string | null
          id: string
          name: string
          raw_query: string
          source: string
          source_url: string
          status: string
          submitted_by: string | null
        }
        Insert: {
          category?: string
          city_id?: string | null
          city_name?: string
          contact_email?: string
          created_at?: string
          description?: string
          guide_id?: string | null
          id?: string
          name: string
          raw_query?: string
          source?: string
          source_url?: string
          status?: string
          submitted_by?: string | null
        }
        Update: {
          category?: string
          city_id?: string | null
          city_name?: string
          contact_email?: string
          created_at?: string
          description?: string
          guide_id?: string | null
          id?: string
          name?: string
          raw_query?: string
          source?: string
          source_url?: string
          status?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_suggestions_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_suggestions_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
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
      profiles: {
        Row: {
          avatar_url: string | null
          city_id: string | null
          created_at: string
          full_name: string | null
          id: string
          locale: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          locale?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          locale?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
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
          guide_reply: string | null
          guide_reply_at: string | null
          id: string
          photos: string[]
          rating: number
          tour_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          comment?: string
          created_at?: string
          guide_id: string
          guide_reply?: string | null
          guide_reply_at?: string | null
          id?: string
          photos?: string[]
          rating: number
          tour_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          comment?: string
          created_at?: string
          guide_id?: string
          guide_reply?: string | null
          guide_reply_at?: string | null
          id?: string
          photos?: string[]
          rating?: number
          tour_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
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
      spotlights: {
        Row: {
          badge: string | null
          created_at: string
          description_en: string
          description_ru: string
          description_uz: string
          expires_at: string | null
          guide_id: string | null
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
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          badge?: string | null
          created_at?: string
          description_en?: string
          description_ru?: string
          description_uz?: string
          expires_at?: string | null
          guide_id?: string | null
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
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          badge?: string | null
          created_at?: string
          description_en?: string
          description_ru?: string
          description_uz?: string
          expires_at?: string | null
          guide_id?: string | null
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
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spotlights_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spotlights_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
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
      tour_schedules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          start_time: string
          tour_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          start_time: string
          tour_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          start_time?: string
          tour_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "tour_schedules_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          base_language: string
          children_free_under: number
          city_id: string
          cover_url: string | null
          created_at: string
          description_md: string
          description_md_en: string
          description_md_ru: string
          description_md_uz: string
          duration_hours: number
          end_lat: number | null
          end_lng: number | null
          end_point: string
          end_same_as_meeting: boolean
          fixed_max_guests: number | null
          fixed_price: number | null
          group_prices: Json
          group_tiers: Json | null
          guide_id: string
          highlights: string[]
          highlights_en: string[]
          highlights_ru: string[]
          highlights_uz: string[]
          id: string
          included: string[]
          included_en: string[]
          included_ru: string[]
          included_uz: string[]
          language_multipliers: Json
          languages: string[]
          max_guests: number | null
          meeting_lat: number | null
          meeting_lng: number | null
          meeting_point: string
          not_included: string[]
          not_included_en: string[]
          not_included_ru: string[]
          not_included_uz: string[]
          per_person_price: number | null
          price_by_language: Json
          price_from: number
          pricing_base_language: string | null
          pricing_mode: string
          pricing_modes: string[]
          published: boolean
          rating: number
          reviews_count: number
          short_description: string
          short_description_en: string
          short_description_ru: string
          short_description_uz: string
          slug: string
          sort_order: number
          title: string
          title_en: string
          title_ru: string
          title_uz: string
          transport_included: boolean
          updated_at: string
        }
        Insert: {
          base_language?: string
          children_free_under?: number
          city_id: string
          cover_url?: string | null
          created_at?: string
          description_md?: string
          description_md_en?: string
          description_md_ru?: string
          description_md_uz?: string
          duration_hours?: number
          end_lat?: number | null
          end_lng?: number | null
          end_point?: string
          end_same_as_meeting?: boolean
          fixed_max_guests?: number | null
          fixed_price?: number | null
          group_prices?: Json
          group_tiers?: Json | null
          guide_id: string
          highlights?: string[]
          highlights_en?: string[]
          highlights_ru?: string[]
          highlights_uz?: string[]
          id?: string
          included?: string[]
          included_en?: string[]
          included_ru?: string[]
          included_uz?: string[]
          language_multipliers?: Json
          languages?: string[]
          max_guests?: number | null
          meeting_lat?: number | null
          meeting_lng?: number | null
          meeting_point?: string
          not_included?: string[]
          not_included_en?: string[]
          not_included_ru?: string[]
          not_included_uz?: string[]
          per_person_price?: number | null
          price_by_language?: Json
          price_from?: number
          pricing_base_language?: string | null
          pricing_mode?: string
          pricing_modes?: string[]
          published?: boolean
          rating?: number
          reviews_count?: number
          short_description?: string
          short_description_en?: string
          short_description_ru?: string
          short_description_uz?: string
          slug: string
          sort_order?: number
          title: string
          title_en?: string
          title_ru?: string
          title_uz?: string
          transport_included?: boolean
          updated_at?: string
        }
        Update: {
          base_language?: string
          children_free_under?: number
          city_id?: string
          cover_url?: string | null
          created_at?: string
          description_md?: string
          description_md_en?: string
          description_md_ru?: string
          description_md_uz?: string
          duration_hours?: number
          end_lat?: number | null
          end_lng?: number | null
          end_point?: string
          end_same_as_meeting?: boolean
          fixed_max_guests?: number | null
          fixed_price?: number | null
          group_prices?: Json
          group_tiers?: Json | null
          guide_id?: string
          highlights?: string[]
          highlights_en?: string[]
          highlights_ru?: string[]
          highlights_uz?: string[]
          id?: string
          included?: string[]
          included_en?: string[]
          included_ru?: string[]
          included_uz?: string[]
          language_multipliers?: Json
          languages?: string[]
          max_guests?: number | null
          meeting_lat?: number | null
          meeting_lng?: number | null
          meeting_point?: string
          not_included?: string[]
          not_included_en?: string[]
          not_included_ru?: string[]
          not_included_uz?: string[]
          per_person_price?: number | null
          price_by_language?: Json
          price_from?: number
          pricing_base_language?: string | null
          pricing_mode?: string
          pricing_modes?: string[]
          published?: boolean
          rating?: number
          reviews_count?: number
          short_description?: string
          short_description_en?: string
          short_description_ru?: string
          short_description_uz?: string
          slug?: string
          sort_order?: number
          title?: string
          title_en?: string
          title_ru?: string
          title_uz?: string
          transport_included?: boolean
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
          {
            foreignKeyName: "tours_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_diaries: {
        Row: {
          city: string | null
          cover_url: string | null
          created_at: string
          days: Json
          end_date: string | null
          id: string
          is_public: boolean
          start_date: string | null
          stats: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          cover_url?: string | null
          created_at?: string
          days?: Json
          end_date?: string | null
          id?: string
          is_public?: boolean
          start_date?: string | null
          stats?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          cover_url?: string | null
          created_at?: string
          days?: Json
          end_date?: string | null
          id?: string
          is_public?: boolean
          start_date?: string | null
          stats?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_budgets: {
        Row: {
          city: string | null
          created_at: string
          currency: string
          end_date: string | null
          id: string
          items: Json
          start_date: string | null
          total: number
          travelers: number
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          items?: Json
          start_date?: string | null
          total?: number
          travelers?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          items?: Json
          start_date?: string | null
          total?: number
          travelers?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_wallets: {
        Row: {
          created_at: string
          currency: string
          end_date: string
          id: string
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          end_date: string
          id?: string
          start_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          end_date?: string
          id?: string
          start_date?: string
          title?: string
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
      wallet_expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["wallet_expense_category"]
          created_at: string
          id: string
          note: string | null
          spent_on: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["wallet_expense_category"]
          created_at?: string
          id?: string
          note?: string | null
          spent_on: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["wallet_expense_category"]
          created_at?: string
          id?: string
          note?: string | null
          spent_on?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_expenses_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "trip_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_collections: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          collection_id: string | null
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "wishlist_collections"
            referencedColumns: ["id"]
          },
        ]
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
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_guide_referral_code: { Args: { _base: string }; Returns: string }
      get_wallet_summary: { Args: { _wallet_id: string }; Returns: Json }
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
      match_article_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          article_id: string
          article_slug: string
          article_title: string
          content: string
          similarity: number
        }[]
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
      recompute_guide_completed_tours: {
        Args: { _guide_id: string }
        Returns: undefined
      }
      recompute_guide_rating: {
        Args: { _guide_id: string }
        Returns: undefined
      }
      recompute_guide_response_time: {
        Args: { _guide_id: string }
        Returns: undefined
      }
      recompute_tour_rating: { Args: { _tour_id: string }; Returns: undefined }
      validate_group_tiers: { Args: { _tiers: Json }; Returns: boolean }
    }
    Enums: {
      app_role: "admin"
      post_media_type: "reel" | "article"
      wallet_expense_category:
        | "accommodation"
        | "food"
        | "transport"
        | "souvenirs"
        | "other"
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
      post_media_type: ["reel", "article"],
      wallet_expense_category: [
        "accommodation",
        "food",
        "transport",
        "souvenirs",
        "other",
      ],
    },
  },
} as const
