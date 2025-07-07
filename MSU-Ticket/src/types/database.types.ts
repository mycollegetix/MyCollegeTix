// types/database.types.ts
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          username: string;
          full_name: string;
          avatar_url: string | null;
          email: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name: string;
          avatar_url?: string | null;
          email: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string;
          avatar_url?: string | null;
          email?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          description: string;
          price: number;
          seller_id: string;
          buyer_id: string | null;
          status: "available" | "sold" | "cancelled";
          event_date: string;
          location: string;
          image_url: string | null;
          section: string | null;
          row_number: string | null;
          seat_number: string | null;
        };
        Insert: {
          title: string;
          description: string;
          price: number;
          seller_id: string;
          event_date: string;
          location: string;
          image_url?: string | null;
          section?: string | null;
          row_number?: string | null;
          seat_number?: string | null;
        };
        Update: {
          title?: string;
          description?: string;
          price?: number;
          status?: "available" | "sold" | "cancelled";
          event_date?: string;
          location?: string;
          image_url?: string | null;
          section?: string | null;
          row_number?: string | null;
          seat_number?: string | null;
        };
      };
    };
    Functions: {
      purchase_ticket: {
        Args: { ticket_id: string };
        Returns: Database["public"]["Tables"]["tickets"]["Row"];
      };
    };
  };
}

// Extended ticket interface with seller info
export interface TicketWithSeller
  extends Database["public"]["Tables"]["tickets"]["Row"] {
  seller: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// Order interface for tracking purchases and sales
export interface Order {
  id: string;
  ticket: TicketWithSeller;
  type: "purchase" | "sale";
  status: "pending" | "completed" | "cancelled";
  created_at: string;
}
