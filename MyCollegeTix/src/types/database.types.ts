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
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          created_at: string
          email_domain: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          short_name: string
          transfer_portal_url: string | null
        }
        Insert: {
          created_at?: string
          email_domain: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          short_name: string
          transfer_portal_url?: string | null
        }
        Update: {
          created_at?: string
          email_domain?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string
          transfer_portal_url?: string | null
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          additional_context: Json | null
          admin_notes: string | null
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_by: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          additional_context?: Json | null
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_by: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          additional_context?: Json | null
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_by?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived: boolean | null
          created_at: string
          id: string
          last_message_at: string | null
          last_message_id: string | null
          participant_1_id: string
          participant_2_id: string
          ticket_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_id?: string | null
          participant_1_id: string
          participant_2_id: string
          ticket_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_id?: string | null
          participant_1_id?: string
          participant_2_id?: string
          ticket_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_college_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_disputes: {
        Row: {
          created_at: string
          description: string | null
          escrow_payment_id: string
          evidence_urls: string[] | null
          filed_by: string
          filed_by_role: string
          id: string
          order_id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          escrow_payment_id: string
          evidence_urls?: string[] | null
          filed_by: string
          filed_by_role: string
          id?: string
          order_id: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          escrow_payment_id?: string
          evidence_urls?: string[] | null
          filed_by?: string
          filed_by_role?: string
          id?: string
          order_id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_disputes_escrow_payment_id_fkey"
            columns: ["escrow_payment_id"]
            isOneToOne: false
            referencedRelation: "escrow_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_disputes_filed_by_fkey"
            columns: ["filed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_payments: {
        Row: {
          amount_cents: number
          buyer_email: string | null
          created_at: string
          currency: string
          id: string
          order_id: string
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          buyer_email?: string | null
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_email?: string | null
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          away_college_id: string | null
          away_team: string | null
          category: string | null
          college_id: string | null
          created_at: string
          description: string | null
          event_date: string
          external_id: string | null
          game_time: string | null
          home_college_id: string | null
          home_team: string | null
          id: string
          is_home_game: boolean | null
          is_season_pass: boolean
          location: string
          opponent: string | null
          source: string
          source_file: string | null
          sport: string | null
          status: string
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          away_college_id?: string | null
          away_team?: string | null
          category?: string | null
          college_id?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          external_id?: string | null
          game_time?: string | null
          home_college_id?: string | null
          home_team?: string | null
          id?: string
          is_home_game?: boolean | null
          is_season_pass?: boolean
          location: string
          opponent?: string | null
          source?: string
          source_file?: string | null
          sport?: string | null
          status?: string
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          away_college_id?: string | null
          away_team?: string | null
          category?: string | null
          college_id?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          external_id?: string | null
          game_time?: string | null
          home_college_id?: string | null
          home_team?: string | null
          id?: string
          is_home_game?: boolean | null
          is_season_pass?: boolean
          location?: string
          opponent?: string | null
          source?: string
          source_file?: string | null
          sport?: string | null
          status?: string
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_away_college_id_fkey"
            columns: ["away_college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_home_college_id_fkey"
            columns: ["home_college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_versions: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          document_type: string
          effective_date: string
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
          version: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          document_type: string
          effective_date: string
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
          version: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          document_type?: string
          effective_date?: string
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          message_type: string
          read_at: string | null
          read_by_recipient: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string
          read_at?: string | null
          read_by_recipient?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string
          read_at?: string | null
          read_by_recipient?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          push_metadata: Json | null
          push_sent: boolean | null
          push_sent_at: string | null
          read: boolean | null
          related_order_id: string | null
          related_ticket_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          push_metadata?: Json | null
          push_sent?: boolean | null
          push_sent_at?: string | null
          read?: boolean | null
          related_order_id?: string | null
          related_ticket_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          push_metadata?: Json | null
          push_sent?: boolean | null
          push_sent_at?: string | null
          read?: boolean | null
          related_order_id?: string | null
          related_ticket_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_ticket_id_fkey"
            columns: ["related_ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_college_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_ticket_id_fkey"
            columns: ["related_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          buyer_id: string
          completed_at: string | null
          created_at: string
          escrow_status: string | null
          event_start_time: string | null
          id: string
          notes: string | null
          payment_method: string | null
          seller_id: string
          status: string
          ticket_id: string
          transaction_id: string | null
          transfer_deadline: string | null
        }
        Insert: {
          amount: number
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          escrow_status?: string | null
          event_start_time?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          seller_id: string
          status?: string
          ticket_id: string
          transaction_id?: string | null
          transfer_deadline?: string | null
        }
        Update: {
          amount?: number
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          escrow_status?: string | null
          event_start_time?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          seller_id?: string
          status?: string
          ticket_id?: string
          transaction_id?: string | null
          transfer_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_college_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepted_terms: boolean | null
          accepted_terms_at: string | null
          avatar_url: string | null
          college_id: string | null
          created_at: string
          current_ip_address: string | null
          device_info: Json | null
          email: string
          expo_push_token: string | null
          full_name: string
          id: string
          ip_updated_at: string | null
          is_admin: boolean
          is_trusted: boolean | null
          last_ip_address: string | null
          location_data: Json | null
          stripe_onboarding_complete: boolean | null
          trust_earned_at: string | null
          user_agent: string | null
          username: string
        }
        Insert: {
          accepted_terms?: boolean | null
          accepted_terms_at?: string | null
          avatar_url?: string | null
          college_id?: string | null
          created_at?: string
          current_ip_address?: string | null
          device_info?: Json | null
          email: string
          expo_push_token?: string | null
          full_name: string
          id: string
          ip_updated_at?: string | null
          is_admin?: boolean
          is_trusted?: boolean | null
          last_ip_address?: string | null
          location_data?: Json | null
          stripe_onboarding_complete?: boolean | null
          trust_earned_at?: string | null
          user_agent?: string | null
          username: string
        }
        Update: {
          accepted_terms?: boolean | null
          accepted_terms_at?: string | null
          avatar_url?: string | null
          college_id?: string | null
          created_at?: string
          current_ip_address?: string | null
          device_info?: Json | null
          email?: string
          expo_push_token?: string | null
          full_name?: string
          id?: string
          ip_updated_at?: string | null
          is_admin?: boolean
          is_trusted?: boolean | null
          last_ip_address?: string | null
          location_data?: Json | null
          stripe_onboarding_complete?: boolean | null
          trust_earned_at?: string | null
          user_agent?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_queue: {
        Row: {
          attempts: number | null
          body: string
          created_at: string | null
          data: Json | null
          error_message: string | null
          id: string
          max_attempts: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          title: string
          user_ids: string[]
        }
        Insert: {
          attempts?: number | null
          body: string
          created_at?: string | null
          data?: Json | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          user_ids: string[]
        }
        Update: {
          attempts?: number | null
          body?: string
          created_at?: string | null
          data?: Json | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          user_ids?: string[]
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          active: boolean
          created_at: string | null
          device_info: Json | null
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          device_info?: Json | null
          id?: string
          platform?: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          device_info?: Json | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rating_prompts: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          prompt_type: string
          prompted_at: string | null
          prompter_id: string
          ratee_id: string
          status: string
          ticket_sale_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          prompt_type: string
          prompted_at?: string | null
          prompter_id: string
          ratee_id: string
          status?: string
          ticket_sale_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          prompt_type?: string
          prompted_at?: string | null
          prompter_id?: string
          ratee_id?: string
          status?: string
          ticket_sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_prompts_prompter_id_fkey"
            columns: ["prompter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_prompts_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_prompts_ticket_sale_id_fkey"
            columns: ["ticket_sale_id"]
            isOneToOne: false
            referencedRelation: "ticket_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_transfers: {
        Row: {
          amount_cents: number
          created_at: string
          escrow_payment_id: string
          failure_reason: string | null
          id: string
          seller_id: string
          status: string
          stripe_account_id: string
          stripe_transfer_id: string
          transferred_at: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          escrow_payment_id: string
          failure_reason?: string | null
          id?: string
          seller_id: string
          status?: string
          stripe_account_id: string
          stripe_transfer_id: string
          transferred_at?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          escrow_payment_id?: string
          failure_reason?: string | null
          id?: string
          seller_id?: string
          status?: string
          stripe_account_id?: string
          stripe_transfer_id?: string
          transferred_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_transfers_escrow_payment_id_fkey"
            columns: ["escrow_payment_id"]
            isOneToOne: false
            referencedRelation: "escrow_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_transfers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_accounts: {
        Row: {
          account_status: string
          charges_enabled: boolean
          created_at: string
          details_submitted: boolean
          id: string
          onboarding_completed: boolean
          payouts_enabled: boolean
          stripe_account_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          charges_enabled?: boolean
          created_at?: string
          details_submitted?: boolean
          id?: string
          onboarding_completed?: boolean
          payouts_enabled?: boolean
          stripe_account_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          charges_enabled?: boolean
          created_at?: string
          details_submitted?: boolean
          id?: string
          onboarding_completed?: boolean
          payouts_enabled?: boolean
          stripe_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          operation: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          operation: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          operation?: string
        }
        Relationships: []
      }
      ticket_sales: {
        Row: {
          additional_notes: string | null
          buyer_id: string | null
          buyer_name: string
          created_at: string
          id: string
          original_asking_price: number | null
          payment_method: string | null
          sale_price: number
          seller_id: string
          seller_name: string | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          buyer_id?: string | null
          buyer_name: string
          created_at?: string
          id?: string
          original_asking_price?: number | null
          payment_method?: string | null
          sale_price: number
          seller_id: string
          seller_name?: string | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          buyer_id?: string | null
          buyer_name?: string
          created_at?: string
          id?: string
          original_asking_price?: number | null
          payment_method?: string | null
          sale_price?: number
          seller_id?: string
          seller_name?: string | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_sales_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_college_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_transfers: {
        Row: {
          buyer_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          order_id: string
          seller_id: string
          status: string
          ticket_id: string
          transfer_deadline: string
          transfer_initiated_at: string | null
          transfer_method: string | null
          transfer_proof_url: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          order_id: string
          seller_id: string
          status?: string
          ticket_id: string
          transfer_deadline: string
          transfer_initiated_at?: string | null
          transfer_method?: string | null
          transfer_proof_url?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          order_id?: string
          seller_id?: string
          status?: string
          ticket_id?: string
          transfer_deadline?: string
          transfer_initiated_at?: string | null
          transfer_method?: string | null
          transfer_proof_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_transfers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_transfers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_transfers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_transfers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_college_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_transfers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          away_college_id: string | null
          buyer_id: string | null
          created_at: string
          description: string
          event_date: string
          event_id: string | null
          home_college_id: string | null
          id: string
          image_url: string | null
          is_season_ticket: boolean | null
          location: string
          price: number
          row_number: string | null
          seat_number: string | null
          section: string | null
          seller_id: string
          sport: string | null
          status: string
          ticket_type: string
          title: string
        }
        Insert: {
          away_college_id?: string | null
          buyer_id?: string | null
          created_at?: string
          description: string
          event_date: string
          event_id?: string | null
          home_college_id?: string | null
          id?: string
          image_url?: string | null
          is_season_ticket?: boolean | null
          location: string
          price: number
          row_number?: string | null
          seat_number?: string | null
          section?: string | null
          seller_id: string
          sport?: string | null
          status?: string
          ticket_type?: string
          title: string
        }
        Update: {
          away_college_id?: string | null
          buyer_id?: string | null
          created_at?: string
          description?: string
          event_date?: string
          event_id?: string | null
          home_college_id?: string | null
          id?: string
          image_url?: string | null
          is_season_ticket?: boolean | null
          location?: string
          price?: number
          row_number?: string | null
          seat_number?: string | null
          section?: string | null
          seller_id?: string
          sport?: string | null
          status?: string
          ticket_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_away_college_id_fkey"
            columns: ["away_college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_college_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_home_college_id_fkey"
            columns: ["home_college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ratings: {
        Row: {
          communication_rating: number | null
          created_at: string
          id: string
          rated_user_id: string
          rater_id: string
          rating: number
          reliability_rating: number | null
          review_text: string | null
          ticket_sale_id: string
          transaction_smoothness: number | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          communication_rating?: number | null
          created_at?: string
          id?: string
          rated_user_id: string
          rater_id: string
          rating: number
          reliability_rating?: number | null
          review_text?: string | null
          ticket_sale_id: string
          transaction_smoothness?: number | null
          transaction_type: string
          updated_at?: string
        }
        Update: {
          communication_rating?: number | null
          created_at?: string
          id?: string
          rated_user_id?: string
          rater_id?: string
          rating?: number
          reliability_rating?: number | null
          review_text?: string | null
          ticket_sale_id?: string
          transaction_smoothness?: number | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ratings_rated_user_id_fkey"
            columns: ["rated_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_ratings_ticket_sale_id_fkey"
            columns: ["ticket_sale_id"]
            isOneToOne: false
            referencedRelation: "ticket_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trust_status: {
        Row: {
          created_at: string
          id: string
          is_trusted: boolean | null
          successful_purchases: number | null
          successful_sales: number | null
          total_transactions: number | null
          trust_earned_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_trusted?: boolean | null
          successful_purchases?: number | null
          successful_sales?: number | null
          total_transactions?: number | null
          trust_earned_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_trusted?: boolean | null
          successful_purchases?: number | null
          successful_sales?: number | null
          total_transactions?: number | null
          trust_earned_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_trust_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlists: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          notification_enabled: boolean | null
          price_alert_threshold: number | null
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          notification_enabled?: boolean | null
          price_alert_threshold?: number | null
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          notification_enabled?: boolean | null
          price_alert_threshold?: number | null
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlists_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_college_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlists_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      event_college_view: {
        Row: {
          away_college_id: string | null
          away_college_name: string | null
          away_college_short_name: string | null
          away_team: string | null
          category: string | null
          college_id: string | null
          created_at: string | null
          description: string | null
          event_date: string | null
          external_id: string | null
          game_time: string | null
          home_college_id: string | null
          home_college_name: string | null
          home_college_short_name: string | null
          home_team: string | null
          id: string | null
          is_home_game: boolean | null
          location: string | null
          opponent: string | null
          source: string | null
          source_file: string | null
          sport: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          venue: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_away_college_id_fkey"
            columns: ["away_college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_home_college_id_fkey"
            columns: ["home_college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_college_view: {
        Row: {
          away_college_id: string | null
          away_college_name: string | null
          away_college_short_name: string | null
          buyer_id: string | null
          created_at: string | null
          description: string | null
          event_date: string | null
          event_id: string | null
          home_college_id: string | null
          home_college_name: string | null
          home_college_short_name: string | null
          id: string | null
          image_url: string | null
          is_season_ticket: boolean | null
          location: string | null
          price: number | null
          row_number: string | null
          seat_number: string | null
          section: string | null
          seller_id: string | null
          sport: string | null
          status: string | null
          ticket_type: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_away_college_id_fkey"
            columns: ["away_college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_college_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_home_college_id_fkey"
            columns: ["home_college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_legal_document_version: {
        Args: { p_document_type: string; p_version: string }
        Returns: Json
      }
      add_new_college: {
        Args: {
          p_email_domain: string
          p_name: string
          p_primary_color?: string
          p_secondary_color?: string
          p_short_name: string
          p_support_email?: string
          p_website_url?: string
        }
        Returns: string
      }
      admin_create_college: {
        Args: {
          college_email_domain: string
          college_is_active?: boolean
          college_name: string
          college_primary_color?: string
          college_secondary_color?: string
          college_short_name: string
        }
        Returns: string
      }
      admin_delete_college: { Args: { college_id: string }; Returns: Json }
      admin_set_event_status: {
        Args: { event_id: string; new_status: string }
        Returns: boolean
      }
      admin_toggle_college_status: {
        Args: { college_id: string; new_status: boolean }
        Returns: Json
      }
      admin_update_college: {
        Args: {
          college_email_domain?: string
          college_id: string
          college_is_active?: boolean
          college_name?: string
          college_primary_color?: string
          college_secondary_color?: string
          college_short_name?: string
        }
        Returns: Json
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      can_access_content: { Args: { target_user_id: string }; Returns: boolean }
      can_user_access_ticket: {
        Args: { ticket_id: string; user_id: string }
        Returns: boolean
      }
      check_function_security: {
        Args: never
        Returns: {
          function_name: string
          function_signature: string
          is_secure: boolean
          search_path_setting: string
          status: string
        }[]
      }
      check_policy_performance: {
        Args: never
        Returns: {
          has_optimized_auth: boolean
          policy_count: number
          table_name: string
        }[]
      }
      check_rls_status: {
        Args: never
        Returns: {
          policy_count: number
          rls_enabled: boolean
          status: string
          table_name: string
        }[]
      }
      create_notification: {
        Args: {
          p_message: string
          p_related_order_id?: string
          p_related_ticket_id?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_order_id: string
          related_ticket_id: string
          title: string
          type: string
          user_id: string
        }[]
      }
      current_user_id: { Args: never; Returns: string }
      delete_expired_tickets: { Args: never; Returns: undefined }
      delete_old_notifications: { Args: never; Returns: undefined }
      delete_user_completely: {
        Args: { user_id_to_delete: string }
        Returns: Json
      }
      expire_past_events: { Args: never; Returns: number }
      final_policy_check: {
        Args: never
        Returns: {
          index_count: number
          policy_count: number
          status: string
          table_name: string
        }[]
      }
      get_college_by_email: { Args: { email_address: string }; Returns: string }
      get_college_by_team_name: { Args: { team_name: string }; Returns: string }
      get_policy_summary: {
        Args: never
        Returns: {
          has_security: boolean
          policy_count: number
          table_name: string
        }[]
      }
      get_user_college: { Args: never; Returns: string }
      get_user_college_id: { Args: { user_id: string }; Returns: string }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_valid_college_email: {
        Args: { email_address: string }
        Returns: boolean
      }
      list_all_custom_functions: {
        Args: never
        Returns: {
          function_name: string
          function_signature: string
          return_type: string
        }[]
      }
      list_all_policies: {
        Args: never
        Returns: {
          policy_name: string
          policy_roles: string[]
          policy_type: string
          table_name: string
        }[]
      }
      log_admin_action: {
        Args: {
          action_type: string
          details?: Json
          record_id?: string
          table_name: string
        }
        Returns: undefined
      }
      purchase_ticket:
        | { Args: { p_buyer_id?: string; p_ticket_id: string }; Returns: Json }
        | { Args: { ticket_id: string }; Returns: Json }
      security_status_check: {
        Args: never
        Returns: {
          description: string
          feature: string
          status: string
        }[]
      }
      send_push_notification_async: {
        Args: {
          p_body: string
          p_data?: Json
          p_title: string
          p_user_ids: string[]
        }
        Returns: undefined
      }
      test_admin_access: {
        Args: never
        Returns: {
          can_access_admin: boolean
          is_admin: boolean
          is_authenticated: boolean
          profile_exists: boolean
          user_id: string
        }[]
      }
      test_auth_setup: {
        Args: never
        Returns: {
          result: string
          status: string
          test_name: string
        }[]
      }
      test_rls_policies: {
        Args: never
        Returns: {
          can_insert: boolean
          can_select: boolean
          is_admin: boolean
          table_name: string
          user_authenticated: boolean
        }[]
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      update_user_trust_status: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      verify_policy_optimization: {
        Args: never
        Returns: {
          policy_count: number
          status: string
          table_name: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

// ============================================
// Custom Types (not auto-generated)
// ============================================

// Ticket with seller profile info
export interface TicketWithSeller extends Tables<"tickets"> {
  seller: {
    id: string;
    username: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
    college_id?: string | null;
    college?: {
      id: string;
      name: string;
      short_name: string;
    } | null;
  };
  event?: {
    id: string;
    game_time: string | null;
    title: string;
    event_date: string;
    location: string;
    sport?: string | null;
  } | null;
}

// Ticket with full details including colleges
export interface TicketWithDetails extends Tables<"tickets"> {
  seller: {
    id: string;
    username: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
    college_id?: string | null;
  };
  home_college?: {
    id: string;
    name: string;
    short_name: string;
    primary_color?: string | null;
  } | null;
  away_college?: {
    id: string;
    name: string;
    short_name: string;
    primary_color?: string | null;
  } | null;
  event?: {
    id: string;
    game_time: string | null;
    title: string;
    event_date: string;
    location: string;
    sport?: string | null;
  } | null;
}

// Event type alias
export type Event = Tables<"events">
