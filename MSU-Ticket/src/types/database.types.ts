// src/types/database.types.ts - Updated with complete Event types
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
          status: string;
          title: string;
          updated_at: string;
          venue: string | null;
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
          status?: string;
          title: string;
          updated_at?: string;
          venue?: string | null;
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
          status?: string;
          title?: string;
          updated_at?: string;
          venue?: string | null;
        };
        Relationships: [];
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
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          username?: string;
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
      purchase_ticket: {
        Args: { ticket_id: string };
        Returns: Json;
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

// Extended types for specific functionality
export type ConversationWithParticipants =
  Database["public"]["Tables"]["conversations"]["Row"] & {
    participant_1: Database["public"]["Tables"]["profiles"]["Row"];
    participant_2: Database["public"]["Tables"]["profiles"]["Row"];
    last_message?: Database["public"]["Tables"]["messages"]["Row"];
    unread_count?: number;
  };

export type MessageWithSender =
  Database["public"]["Tables"]["messages"]["Row"] & {
    sender: Database["public"]["Tables"]["profiles"]["Row"];
  };

export type ConversationWithDetails =
  Database["public"]["Tables"]["conversations"]["Row"] & {
    participant_1: Database["public"]["Tables"]["profiles"]["Row"];
    participant_2: Database["public"]["Tables"]["profiles"]["Row"];
    last_message?: Database["public"]["Tables"]["messages"]["Row"];
    ticket?: Database["public"]["Tables"]["tickets"]["Row"];
    unread_count: number;
    is_expired?: boolean; // ✅ ADDED: Expired status flag
  };

export type TicketWithSeller = Tables<"tickets"> & {
  seller: Tables<"profiles">;
  event?: Tables<"events">;
};

export type TicketWithEvent = Tables<"tickets"> & {
  event: Tables<"events">;
};

// Event type from database
export type Event = Database["public"]["Tables"]["events"]["Row"];

// Helper type for database operations
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
