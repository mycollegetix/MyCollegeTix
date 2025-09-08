// src/types/database.types.ts - Final Fixed Version
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          table_name: string | null;
          record_id: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          action: string;
          table_name?: string | null;
          record_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          action?: string;
          table_name?: string | null;
          record_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      blocked_users: {
        Row: {
          id: string;
          created_at: string;
          blocker_id: string;
          blocked_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          blocker_id: string;
          blocked_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          blocker_id?: string;
          blocked_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocked_users_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      content_reports: {
        Row: {
          id: string;
          created_at: string;
          content_type: 'ticket' | 'message' | 'profile';
          content_id: string;
          reported_by: string;
          reason: string;
          description: string | null;
          additional_context: Json | null;
          status: 'pending' | 'approved' | 'rejected';
          admin_notes: string | null;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          content_type: 'ticket' | 'message' | 'profile';
          content_id: string;
          reported_by: string;
          reason: string;
          description?: string | null;
          additional_context?: Json | null;
          status?: 'pending' | 'approved' | 'rejected';
          admin_notes?: string | null;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          content_type?: 'ticket' | 'message' | 'profile';
          content_id?: string;
          reported_by?: string;
          reason?: string;
          description?: string | null;
          additional_context?: Json | null;
          status?: 'pending' | 'approved' | 'rejected';
          admin_notes?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "content_reports_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      legal_document_versions: {
        Row: {
          id: string;
          document_type: 'terms_of_service' | 'privacy_policy';
          version: string;
          title: string;
          content: string;
          effective_date: string;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_type: 'terms_of_service' | 'privacy_policy';
          version: string;
          title: string;
          content: string;
          effective_date: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          document_type?: 'terms_of_service' | 'privacy_policy';
          version?: string;
          title?: string;
          content?: string;
          effective_date?: string;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "legal_document_versions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      watchlists: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          ticket_id: string;
          notes: string | null;
          price_alert_threshold: number | null;
          notification_enabled: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          ticket_id: string;
          notes?: string | null;
          price_alert_threshold?: number | null;
          notification_enabled?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          ticket_id?: string;
          notes?: string | null;
          price_alert_threshold?: number | null;
          notification_enabled?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "watchlists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "watchlists_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          }
        ];
      };
      colleges: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          short_name: string;
          email_domain: string;
          logo_url: string | null;
          website_url: string | null;
          support_email: string | null;
          primary_color: string;
          secondary_color: string;
          is_active: boolean;
          transfer_portal_url: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          short_name: string;
          email_domain: string;
          logo_url?: string | null;
          website_url?: string | null;
          support_email?: string | null;
          primary_color?: string;
          secondary_color?: string;
          is_active?: boolean;
          transfer_portal_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          short_name?: string;
          email_domain?: string;
          logo_url?: string | null;
          website_url?: string | null;
          support_email?: string | null;
          primary_color?: string;
          secondary_color?: string;
          is_active?: boolean;
          transfer_portal_url?: string | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          archived: boolean | null;
          created_at: string;
          id: string;
          last_message_at: string | null;
          last_message_id: string | null;
          participant_1_id: string;
          participant_2_id: string;
          ticket_id: string | null;
          updated_at: string;
        };
        Insert: {
          archived?: boolean | null;
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          last_message_id?: string | null;
          participant_1_id: string;
          participant_2_id: string;
          ticket_id?: string | null;
          updated_at?: string;
        };
        Update: {
          archived?: boolean | null;
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          last_message_id?: string | null;
          participant_1_id?: string;
          participant_2_id?: string;
          ticket_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_fkey";
            columns: ["participant_1_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_participant_2_fkey";
            columns: ["participant_2_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          }
        ];
      };
      events: {
        Row: {
          away_team: string | null;
          category: string | null;
          created_at: string;
          description: string | null;
          event_date: string;
          external_id: string | null;
          game_time: string | null;
          home_team: string | null;
          id: string;
          is_home_game: boolean | null;
          location: string;
          opponent: string | null;
          source: string;
          source_file: string | null;
          sport: string | null;
          status:
            | "scraped"
            | "available"
            | "inactive"
            | "completed"
            | "cancelled";
          title: string;
          updated_at: string;
          venue: string | null;
          college_id: string | null;
          home_college_id: string | null;
          away_college_id: string | null;
          is_season_pass: boolean;
        };
        Insert: {
          away_team?: string | null;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          event_date: string;
          external_id?: string | null;
          game_time?: string | null;
          home_team?: string | null;
          id?: string;
          is_home_game?: boolean | null;
          location: string;
          opponent?: string | null;
          source?: string;
          source_file?: string | null;
          sport?: string | null;
          status?:
            | "scraped"
            | "available"
            | "inactive"
            | "completed"
            | "cancelled";
          title: string;
          updated_at?: string;
          venue?: string | null;
          college_id?: string | null;
          home_college_id?: string | null;
          away_college_id?: string | null;
          is_season_pass?: boolean;
        };
        Update: {
          away_team?: string | null;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          event_date?: string;
          external_id?: string | null;
          game_time?: string | null;
          home_team?: string | null;
          id?: string;
          is_home_game?: boolean | null;
          location?: string;
          opponent?: string | null;
          source?: string;
          source_file?: string | null;
          sport?: string | null;
          status?:
            | "scraped"
            | "available"
            | "inactive"
            | "completed"
            | "cancelled";
          title?: string;
          updated_at?: string;
          venue?: string | null;
          college_id?: string | null;
          home_college_id?: string | null;
          away_college_id?: string | null;
          is_season_pass?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "events_college_id_fkey";
            columns: ["college_id"];
            isOneToOne: false;
            referencedRelation: "colleges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_home_college_id_fkey";
            columns: ["home_college_id"];
            isOneToOne: false;
            referencedRelation: "colleges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_away_college_id_fkey";
            columns: ["away_college_id"];
            isOneToOne: false;
            referencedRelation: "colleges";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          edited_at: string | null;
          id: string;
          message_type: string;
          read_at: string | null;
          read_by_recipient: boolean | null;
          sender_id: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          edited_at?: string | null;
          id?: string;
          message_type?: string;
          read_at?: string | null;
          read_by_recipient?: boolean | null;
          sender_id: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          edited_at?: string | null;
          id?: string;
          message_type?: string;
          read_at?: string | null;
          read_by_recipient?: boolean | null;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          read: boolean | null;
          related_order_id: string | null;
          related_ticket_id: string | null;
          title: string;
          type: "purchase" | "sale" | "listing" | "system" | "message";
          user_id: string;
          push_sent?: boolean | null;
          push_sent_at?: string | null;
          push_metadata?: Json | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          read?: boolean | null;
          related_order_id?: string | null;
          related_ticket_id?: string | null;
          title: string;
          type?: "purchase" | "sale" | "listing" | "system" | "message";
          user_id: string;
          push_sent?: boolean | null;
          push_sent_at?: string | null;
          push_metadata?: Json | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          read?: boolean | null;
          related_order_id?: string | null;
          related_ticket_id?: string | null;
          title?: string;
          type?: "purchase" | "sale" | "listing" | "system" | "message";
          user_id?: string;
          push_sent?: boolean | null;
          push_sent_at?: string | null;
          push_metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_related_order_id_fkey";
            columns: ["related_order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_related_ticket_id_fkey";
            columns: ["related_ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      orders: {
        Row: {
          amount: number;
          buyer_id: string;
          completed_at: string | null;
          created_at: string;
          id: string;
          notes: string | null;
          payment_method: string | null;
          seller_id: string;
          status: string;
          ticket_id: string;
          transaction_id: string | null;
        };
        Insert: {
          amount: number;
          buyer_id: string;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_method?: string | null;
          seller_id: string;
          status?: string;
          ticket_id: string;
          transaction_id?: string | null;
        };
        Update: {
          amount?: number;
          buyer_id?: string;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          payment_method?: string | null;
          seller_id?: string;
          status?: string;
          ticket_id?: string;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          username: string;
          is_admin: boolean;
          college_id: string | null;
          expo_push_token?: string | null;
          current_ip_address: string | null;
          last_ip_address: string | null;
          ip_updated_at: string | null;
          device_info: Json | null;
          location_data: Json | null;
          user_agent: string | null;
          is_trusted: boolean;
          trust_earned_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          username: string;
          is_admin?: boolean;
          college_id?: string | null;
          expo_push_token?: string | null;
          current_ip_address?: string | null;
          last_ip_address?: string | null;
          ip_updated_at?: string | null;
          device_info?: Json | null;
          location_data?: Json | null;
          user_agent?: string | null;
          is_trusted?: boolean;
          trust_earned_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          username?: string;
          is_admin?: boolean;
          college_id?: string | null;
          expo_push_token?: string | null;
          current_ip_address?: string | null;
          last_ip_address?: string | null;
          ip_updated_at?: string | null;
          device_info?: Json | null;
          location_data?: Json | null;
          user_agent?: string | null;
          is_trusted?: boolean;
          trust_earned_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_college_id_fkey";
            columns: ["college_id"];
            isOneToOne: false;
            referencedRelation: "colleges";
            referencedColumns: ["id"];
          }
        ];
      };
      system_logs: {
        Row: {
          id: string;
          operation: string;
          details: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          operation: string;
          details?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          operation?: string;
          details?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      tickets: {
        Row: {
          buyer_id: string | null;
          created_at: string;
          description: string;
          event_date: string;
          event_id: string | null;
          id: string;
          image_url: string | null;
          location: string;
          price: number;
          row_number: string | null;
          seat_number: string | null;
          section: string | null;
          seller_id: string;
          sport: string | null;
          status: string;
          title: string;
          is_season_ticket: boolean;
          ticket_type: 'general_admission' | 'student';
          home_college_id: string | null;
          away_college_id: string | null;
        };
        Insert: {
          buyer_id?: string | null;
          created_at?: string;
          description: string;
          event_date: string;
          event_id?: string | null;
          id?: string;
          image_url?: string | null;
          location: string;
          price: number;
          row_number?: string | null;
          seat_number?: string | null;
          section?: string | null;
          seller_id: string;
          sport?: string | null;
          status?: string;
          title: string;
          is_season_ticket?: boolean;
          ticket_type?: 'general_admission' | 'student'; // defaults to 'student'
          home_college_id?: string | null;
          away_college_id?: string | null;
        };
        Update: {
          buyer_id?: string | null;
          created_at?: string;
          description?: string;
          event_date?: string;
          event_id?: string | null;
          id?: string;
          image_url?: string | null;
          location?: string;
          price?: number;
          row_number?: string | null;
          seat_number?: string | null;
          section?: string | null;
          seller_id?: string;
          sport?: string | null;
          status?: string;
          title?: string;
          is_season_ticket?: boolean;
          ticket_type?: 'general_admission' | 'student'; // defaults to 'student'
          home_college_id?: string | null;
          away_college_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_home_college_id_fkey";
            columns: ["home_college_id"];
            isOneToOne: false;
            referencedRelation: "colleges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_away_college_id_fkey";
            columns: ["away_college_id"];
            isOneToOne: false;
            referencedRelation: "colleges";
            referencedColumns: ["id"];
          }
        ];
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: string;
          active: boolean;
          device_info: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform?: string;
          active?: boolean;
          device_info?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          platform?: string;
          active?: boolean;
          device_info?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      push_notification_queue: {
        Row: {
          id: string;
          user_ids: string[];
          title: string;
          body: string;
          data: Json;
          status: string;
          attempts: number;
          max_attempts: number;
          scheduled_for: string;
          sent_at: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_ids: string[];
          title: string;
          body: string;
          data?: Json;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          scheduled_for?: string;
          sent_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_ids?: string[];
          title?: string;
          body?: string;
          data?: Json;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          scheduled_for?: string;
          sent_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_violations: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string | null;
          ticket_id: string | null;
          violation_type: string;
          content: string | null;
          reason: string | null;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id?: string | null;
          ticket_id?: string | null;
          violation_type: string;
          content?: string | null;
          reason?: string | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string | null;
          ticket_id?: string | null;
          violation_type?: string;
          content?: string | null;
          reason?: string | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_violations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_violations_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_violations_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          }
        ];
      };
      moderation_logs: {
        Row: {
          id: string;
          content: string | null;
          reason: string;
          method: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          content?: string | null;
          reason: string;
          method: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          content?: string | null;
          reason?: string;
          method?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      ticket_sales: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          ticket_id: string;
          seller_id: string;
          buyer_name: string;
          sale_price: number;
          payment_method: string | null;
          additional_notes: string | null;
          original_asking_price: number | null;
          buyer_id: string | null;
          seller_name: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          ticket_id: string;
          seller_id: string;
          buyer_name: string;
          sale_price: number;
          payment_method?: string | null;
          additional_notes?: string | null;
          original_asking_price?: number | null;
          buyer_id?: string | null;
          seller_name?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          ticket_id?: string;
          seller_id?: string;
          buyer_name?: string;
          sale_price?: number;
          payment_method?: string | null;
          additional_notes?: string | null;
          original_asking_price?: number | null;
          buyer_id?: string | null;
          seller_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_sales_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_sales_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_sales_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      user_ratings: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          rater_id: string;
          rated_user_id: string;
          ticket_sale_id: string;
          transaction_type: 'buying' | 'selling';
          rating: number;
          review_text: string | null;
          communication_rating: number | null;
          reliability_rating: number | null;
          transaction_smoothness: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          rater_id: string;
          rated_user_id: string;
          ticket_sale_id: string;
          transaction_type: 'buying' | 'selling';
          rating: number;
          review_text?: string | null;
          communication_rating?: number | null;
          reliability_rating?: number | null;
          transaction_smoothness?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          rater_id?: string;
          rated_user_id?: string;
          ticket_sale_id?: string;
          transaction_type?: 'buying' | 'selling';
          rating?: number;
          review_text?: string | null;
          communication_rating?: number | null;
          reliability_rating?: number | null;
          transaction_smoothness?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_ratings_rater_id_fkey";
            columns: ["rater_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_ratings_rated_user_id_fkey";
            columns: ["rated_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_ratings_ticket_sale_id_fkey";
            columns: ["ticket_sale_id"];
            isOneToOne: false;
            referencedRelation: "ticket_sales";
            referencedColumns: ["id"];
          }
        ];
      };
      user_trust_status: {
        Row: {
          id: string;
          user_id: string;
          successful_purchases: number;
          successful_sales: number;
          total_transactions: number;
          is_trusted: boolean;
          trust_earned_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          successful_purchases?: number;
          successful_sales?: number;
          total_transactions?: number;
          is_trusted?: boolean;
          trust_earned_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          successful_purchases?: number;
          successful_sales?: number;
          total_transactions?: number;
          is_trusted?: boolean;
          trust_earned_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_trust_status_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      rating_prompts: {
        Row: {
          id: string;
          created_at: string;
          ticket_sale_id: string;
          prompter_id: string;
          ratee_id: string;
          prompt_type: 'seller_rate_buyer' | 'buyer_rate_seller';
          status: 'pending' | 'completed' | 'dismissed' | 'expired';
          prompted_at: string | null;
          completed_at: string | null;
          expires_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          ticket_sale_id: string;
          prompter_id: string;
          ratee_id: string;
          prompt_type: 'seller_rate_buyer' | 'buyer_rate_seller';
          status?: 'pending' | 'completed' | 'dismissed' | 'expired';
          prompted_at?: string | null;
          completed_at?: string | null;
          expires_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          ticket_sale_id?: string;
          prompter_id?: string;
          ratee_id?: string;
          prompt_type?: 'seller_rate_buyer' | 'buyer_rate_seller';
          status?: 'pending' | 'completed' | 'dismissed' | 'expired';
          prompted_at?: string | null;
          completed_at?: string | null;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rating_prompts_ratee_id_fkey";
            columns: ["ratee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_prompts_ticket_sale_id_fkey";
            columns: ["ticket_sale_id"];
            isOneToOne: false;
            referencedRelation: "ticket_sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rating_prompts_prompter_id_fkey";
            columns: ["prompter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_expired_tickets: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      delete_old_notifications: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      delete_user: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      delete_user_completely: {
        Args: {
          user_id_to_delete: string;
        };
        Returns: {
          success: boolean;
          error?: string;
          user_id?: string;
          deleted_data?: Json;
          timestamp?: string;
        };
      };
      purchase_ticket: {
        Args: {
          p_ticket_id: string;
          p_buyer_id?: string;
        };
        Returns: {
          success: boolean;
          order_id?: string;
          ticket_id?: string;
          amount?: number;
          message?: string;
          error?: string;
          error_code?: string;
        };
      };
      get_user_college: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_valid_college_email: {
        Args: { email_address: string };
        Returns: boolean;
      };
      get_college_by_email: {
        Args: { email_address: string };
        Returns: string;
      };
      add_new_college: {
        Args: {
          p_name: string;
          p_short_name: string;
          p_email_domain: string;
          p_website_url?: string;
          p_support_email?: string;
          p_primary_color?: string;
          p_secondary_color?: string;
        };
        Returns: string;
      };
      get_college_by_team_name: {
        Args: { team_name: string };
        Returns: string;
      };
      admin_toggle_college_status: {
        Args: {
          college_id: string;
          new_status: boolean;
        };
        Returns: Json;
      };
      admin_create_college: {
        Args: {
          college_name: string;
          college_short_name: string;
          college_email_domain: string;
          college_primary_color?: string;
          college_secondary_color?: string;
          college_is_active?: boolean;
        };
        Returns: string;
      };
      admin_update_college: {
        Args: {
          college_id: string;
          college_name?: string;
          college_short_name?: string;
          college_email_domain?: string;
          college_primary_color?: string;
          college_secondary_color?: string;
          college_is_active?: boolean;
        };
        Returns: Json;
      };
      admin_delete_college: {
        Args: {
          college_id: string;
        };
        Returns: Json;
      };
      admin_check_test: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      create_notification: {
        Args: {
          p_user_id: string;
          p_title: string;
          p_message: string;
          p_type: string;
          p_related_ticket_id?: string;
          p_related_order_id?: string;
        };
        Returns: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          related_ticket_id: string | null;
          related_order_id: string | null;
          read: boolean | null;
          created_at: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types
type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

// Base types
export type Event = Tables<"events">;
export type Ticket = Tables<"tickets">;
export type Profile = Tables<"profiles">;
export type College = Tables<"colleges">;

// Extended types with proper relationships
export type ProfileWithCollege = Profile & {
  college?: College | null;
};

export type EventWithColleges = Event & {
  home_college?: College | null;
  away_college?: College | null;
};

export type TicketWithSeller = Ticket & {
  seller: Profile & {
    college?: College | null;
  };
  event?: Event | null;
  home_college?: College | null;
  away_college?: College | null;
  // Add computed properties for frontend
  collegeMatchup?: string | null;
  isFromUserCollege?: boolean;
};

export type TicketWithEvent = Ticket & {
  event: Event;
  home_college?: College | null;
  away_college?: College | null;
};

export type TicketWithDetails = Ticket & {
  seller: Profile & {
    college?: College | null;
  };
  event?: Event | null;
  home_college?: College | null;
  away_college?: College | null;
};

// Legacy type compatibility
export type ConversationWithParticipants = Tables<"conversations"> & {
  participant_1: Profile;
  participant_2: Profile;
  last_message?: Tables<"messages"> | null;
  unread_count?: number;
};

export type MessageWithSender = Tables<"messages"> & {
  sender: Profile;
};

export type ConversationWithDetails = Tables<"conversations"> & {
  participant_1: Profile;
  participant_2: Profile;
  last_message?: Tables<"messages"> | null;
  ticket?: Ticket | null;
  unread_count: number;
  is_expired?: boolean;
};
