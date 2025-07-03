export interface Database {
  public: {
    Tables: {
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
          image_url?: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["tickets"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["tickets"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          created_at: string;
          username: string;
          full_name: string;
          avatar_url?: string;
          email: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["profiles"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type TablesRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
