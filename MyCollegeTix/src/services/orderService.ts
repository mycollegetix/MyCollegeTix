// src/services/orderService.ts - Order Management Service
import { supabase } from "@/src/lib/supabase";
import { Tables, TablesUpdate } from "@/src/types/database.types";

// Types for service responses
export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// Order type from database
type Order = Tables<"orders">;

// Extended order with details
export interface OrderWithDetails extends Order {
  buyer: {
    id: string;
    full_name: string;
    email: string;
    username: string;
  };
  seller: {
    id: string;
    full_name: string;
    email: string;
    username: string;
  };
  ticket: {
    id: string;
    title: string;
    event_date: string;
    location: string;
  };
}

// Order filters
export interface OrderFilters {
  status?: string;
  dateRange?: string;
  searchTerm?: string;
  buyerId?: string;
  sellerId?: string;
  limit?: number;
  offset?: number;
}

// Order statistics
export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  averageOrderValue: number;
  recentOrders: OrderWithDetails[];
}

export class OrderService {
  // ============================================
  // BASIC CRUD OPERATIONS
  // ============================================

  /**
   * Get all orders with detailed information (admin only)
   */
  static async getAllOrdersWithDetails(
    filters: OrderFilters = {}
  ): Promise<ServiceResponse<OrderWithDetails[]>> {
    try {
      console.log("📦 Loading orders with details...", filters);

      // Check admin permissions
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return {
          data: null,
          error: "Admin privileges required to view all orders",
          success: false,
        };
      }

      // Build the query
      let query = supabase.from("orders").select(`
          *,
          buyer:profiles!orders_buyer_id_fkey (
            id,
            full_name,
            email,
            username
          ),
          seller:profiles!orders_seller_id_fkey (
            id,
            full_name,
            email,
            username
          ),
          ticket:tickets (
            id,
            title,
            event_date,
            location
          )
        `);

      // Apply filters
      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.buyerId) {
        query = query.eq("buyer_id", filters.buyerId);
      }

      if (filters.sellerId) {
        query = query.eq("seller_id", filters.sellerId);
      }

      if (filters.searchTerm) {
        // Search in ticket titles and user names
        query = query.or(
          `ticket.title.ilike.%${filters.searchTerm}%,` +
            `buyer.full_name.ilike.%${filters.searchTerm}%,` +
            `seller.full_name.ilike.%${filters.searchTerm}%`
        );
      }

      if (filters.dateRange) {
        const today = new Date();
        let dateFilter: Date;

        switch (filters.dateRange) {
          case "today":
            dateFilter = new Date(today.setHours(0, 0, 0, 0));
            break;
          case "week":
            dateFilter = new Date(today.setDate(today.getDate() - 7));
            break;
          case "month":
            dateFilter = new Date(today.setMonth(today.getMonth() - 1));
            break;
          default:
            dateFilter = new Date(0); // No filter
        }

        if (dateFilter.getTime() > 0) {
          query = query.gte("created_at", dateFilter.toISOString());
        }
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 50) - 1
        );
      }

      // Order by creation date (newest first)
      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("❌ Error loading orders:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      console.log("✅ Orders loaded successfully:", data?.length || 0);
      return {
        data: (data as OrderWithDetails[]) || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in getAllOrdersWithDetails:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  /**
   * Get order by ID with details
   */
  static async getOrderById(
    orderId: string
  ): Promise<ServiceResponse<OrderWithDetails>> {
    try {
      console.log("📦 Loading order by ID:", orderId);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          buyer:profiles!orders_buyer_id_fkey (
            id,
            full_name,
            email,
            username
          ),
          seller:profiles!orders_seller_id_fkey (
            id,
            full_name,
            email,
            username
          ),
          ticket:tickets (
            id,
            title,
            event_date,
            location
          )
        `
        )
        .eq("id", orderId)
        .single();

      if (error) {
        console.error("❌ Error loading order:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      return {
        data: data as OrderWithDetails,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in getOrderById:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  /**
   * Get user's orders (as buyer or seller)
   */
  // Add these methods to your existing OrderService class
  // These are simplified versions for regular users (not admin-only)

  /**
   * Get user's purchases (simplified version)
   */
  static async getUserPurchases(): Promise<{
    data: any[] | null;
    error: any;
  }> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          data: null,
          error: "User not authenticated",
        };
      }

      console.log("📦 Loading user purchases for:", user.id);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          amount,
          status,
          created_at,
          completed_at,
          ticket:tickets (
            id,
            title,
            description,
            price,
            event_date,
            location,
            sport,
            section,
            row_number,
            seat_number,
            status
          )
        `
        )
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error loading user purchases:", error);
        return {
          data: null,
          error: error.message,
        };
      }

      // Transform the data to match the expected format for the UI
      const transformedData = (data || [])
        .filter((order: any) => order.ticket) // Only include orders with valid tickets
        .map((order: any) => ({
          id: order.ticket.id,
          title: order.ticket.title,
          description: order.ticket.description,
          price: order.amount || order.ticket.price,
          event_date: order.ticket.event_date,
          location: order.ticket.location,
          sport: order.ticket.sport,
          section: order.ticket.section,
          row_number: order.ticket.row_number,
          seat_number: order.ticket.seat_number,
          status: order.status, // Order status (completed, pending, etc.)
          created_at: order.created_at,
          order_id: order.id, // Keep track of the order ID
        }));

      console.log(
        "✅ User purchases loaded successfully:",
        transformedData.length
      );
      return {
        data: transformedData,
        error: null,
      };
    } catch (error) {
      console.error("💥 Unexpected error in getUserPurchases:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get user's sales (simplified version)
   */
  static async getUserSales(): Promise<{
    data: any[] | null;
    error: any;
  }> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          data: null,
          error: "User not authenticated",
        };
      }

      console.log("📦 Loading user sales for:", user.id);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          amount,
          status,
          created_at,
          completed_at,
          ticket:tickets (
            id,
            title,
            description,
            price,
            event_date,
            location,
            sport,
            section,
            row_number,
            seat_number,
            status
          ),
          buyer:profiles!orders_buyer_id_fkey (
            id,
            full_name,
            username
          )
        `
        )
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error loading user sales:", error);
        return {
          data: null,
          error: error.message,
        };
      }

      // Transform the data to match the expected format for the UI
      const transformedData = (data || [])
        .filter((order: any) => order.ticket) // Only include orders with valid tickets
        .map((order: any) => ({
          id: order.ticket.id,
          title: order.ticket.title,
          description: order.ticket.description,
          price: order.amount || order.ticket.price,
          event_date: order.ticket.event_date,
          location: order.ticket.location,
          sport: order.ticket.sport,
          section: order.ticket.section,
          row_number: order.ticket.row_number,
          seat_number: order.ticket.seat_number,
          status: order.status, // Order status (completed, pending, etc.)
          created_at: order.created_at,
          order_id: order.id,
          buyer: Array.isArray(order.buyer) ? order.buyer[0] : order.buyer,
        }));

      console.log("✅ User sales loaded successfully:", transformedData.length);
      return {
        data: transformedData,
        error: null,
      };
    } catch (error) {
      console.error("💥 Unexpected error in getUserSales:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
  static async getUserOrders(
    userId?: string
  ): Promise<ServiceResponse<OrderWithDetails[]>> {
    try {
      // Get current user if not specified
      if (!userId) {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          return {
            data: null,
            error: "User not authenticated",
            success: false,
          };
        }
        userId = user.id;
      }

      console.log("📦 Loading user orders:", userId);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          buyer:profiles!orders_buyer_id_fkey (
            id,
            full_name,
            email,
            username
          ),
          seller:profiles!orders_seller_id_fkey (
            id,
            full_name,
            email,
            username
          ),
          ticket:tickets (
            id,
            title,
            event_date,
            location
          )
        `
        )
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error loading user orders:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      return {
        data: (data as OrderWithDetails[]) || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in getUserOrders:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  // ============================================
  // ORDER MANAGEMENT
  // ============================================

  /**
   * Update order status (admin only)
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus: string
  ): Promise<ServiceResponse<Order>> {
    try {
      console.log("🔄 Updating order status:", orderId, newStatus);

      // Check admin permissions
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return {
          data: null,
          error: "Admin privileges required to update order status",
          success: false,
        };
      }

      const updateData: TablesUpdate<"orders"> = {
        status: newStatus,
      };

      // Set completed_at when status changes to completed
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select()
        .single();

      if (error) {
        console.error("❌ Error updating order status:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      console.log("✅ Order status updated successfully");
      return {
        data: data as Order,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in updateOrderStatus:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  /**
   * Update order (admin only)
   */
  static async updateOrder(
    orderId: string,
    updates: TablesUpdate<"orders">
  ): Promise<ServiceResponse<Order>> {
    try {
      console.log("🔄 Updating order:", orderId, updates);

      // Check admin permissions
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return {
          data: null,
          error: "Admin privileges required to update orders",
          success: false,
        };
      }

      // Set completed_at when status changes to completed
      if (updates.status === "completed" && !updates.completed_at) {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId)
        .select()
        .single();

      if (error) {
        console.error("❌ Error updating order:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      console.log("✅ Order updated successfully");
      return {
        data: data as Order,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in updateOrder:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  /**
   * Cancel order (admin or order participant)
   */
  static async cancelOrder(
    orderId: string,
    reason?: string
  ): Promise<ServiceResponse<Order>> {
    try {
      console.log("❌ Cancelling order:", orderId, reason);

      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          data: null,
          error: "User not authenticated",
          success: false,
        };
      }

      // Check if user is admin or involved in the order
      const isAdmin = await this.verifyAdminPermissions();

      if (!isAdmin) {
        // Check if user is buyer or seller of this order
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("buyer_id, seller_id")
          .eq("id", orderId)
          .single();

        if (orderError || !order) {
          return {
            data: null,
            error: "Order not found",
            success: false,
          };
        }

        if (order.buyer_id !== user.id && order.seller_id !== user.id) {
          return {
            data: null,
            error: "Permission denied",
            success: false,
          };
        }
      }

      const updateData: TablesUpdate<"orders"> = {
        status: "cancelled",
      };

      if (reason) {
        updateData.notes = reason;
      }

      const { data, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select()
        .single();

      if (error) {
        console.error("❌ Error cancelling order:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      console.log("✅ Order cancelled successfully");
      return {
        data: data as Order,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in cancelOrder:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  // ============================================
  // STATISTICS AND ANALYTICS
  // ============================================

  /**
   * Get order statistics (admin only)
   */
  static async getOrderStats(): Promise<ServiceResponse<OrderStats>> {
    try {
      console.log("📊 Loading order statistics...");

      // Check admin permissions
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return {
          data: null,
          error: "Admin privileges required to view order statistics",
          success: false,
        };
      }

      // Get all orders
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          buyer:profiles!orders_buyer_id_fkey (
            id,
            full_name,
            email,
            username
          ),
          seller:profiles!orders_seller_id_fkey (
            id,
            full_name,
            email,
            username
          ),
          ticket:tickets (
            id,
            title,
            event_date,
            location
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error loading order stats:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      const orderData = orders as OrderWithDetails[];

      // Calculate statistics
      const totalOrders = orderData.length;
      const totalRevenue = orderData
        .filter((order) => order.status === "completed")
        .reduce((sum, order) => sum + order.amount, 0);

      const pendingOrders = orderData.filter(
        (order) => order.status === "pending"
      ).length;
      const completedOrders = orderData.filter(
        (order) => order.status === "completed"
      ).length;
      const cancelledOrders = orderData.filter(
        (order) => order.status === "cancelled"
      ).length;
      const refundedOrders = orderData.filter(
        (order) => order.status === "refunded"
      ).length;

      const averageOrderValue =
        completedOrders > 0 ? totalRevenue / completedOrders : 0;

      // Get recent orders (last 10)
      const recentOrders = orderData.slice(0, 10);

      const stats: OrderStats = {
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        refundedOrders,
        averageOrderValue,
        recentOrders,
      };

      console.log("✅ Order statistics loaded successfully");
      return {
        data: stats,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in getOrderStats:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  /**
   * Get revenue statistics for date range (admin only)
   */
  static async getRevenueStats(
    startDate: Date,
    endDate: Date
  ): Promise<
    ServiceResponse<{
      totalRevenue: number;
      orderCount: number;
      averageValue: number;
    }>
  > {
    try {
      console.log("💰 Loading revenue statistics...", startDate, endDate);

      // Check admin permissions
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return {
          data: null,
          error: "Admin privileges required to view revenue statistics",
          success: false,
        };
      }

      const { data: orders, error } = await supabase
        .from("orders")
        .select("amount, status")
        .eq("status", "completed")
        .gte("completed_at", startDate.toISOString())
        .lte("completed_at", endDate.toISOString());

      if (error) {
        console.error("❌ Error loading revenue stats:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
      const orderCount = orders.length;
      const averageValue = orderCount > 0 ? totalRevenue / orderCount : 0;

      return {
        data: {
          totalRevenue,
          orderCount,
          averageValue,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in getRevenueStats:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Verify admin permissions
   */
  private static async verifyAdminPermissions(): Promise<boolean> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("❌ User not authenticated");
        return false;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("❌ Error checking admin status:", profileError);
        return false;
      }

      const isAdmin = profile?.is_admin === true;
      console.log("🔍 Admin check result:", { userId: user.id, isAdmin });

      return isAdmin;
    } catch (error) {
      console.error("❌ Error in admin verification:", error);
      return false;
    }
  }

  /**
   * Validate order status
   */
  static validateOrderStatus(status: string): boolean {
    const validStatuses = ["pending", "completed", "cancelled", "refunded"];
    return validStatuses.includes(status);
  }

  /**
   * Get order status display info
   */
  static getOrderStatusInfo(status: string): {
    color: string;
    icon: string;
    label: string;
  } {
    switch (status) {
      case "completed":
        return {
          color: "#10b981",
          icon: "checkmark-circle",
          label: "Completed",
        };
      case "pending":
        return {
          color: "#f59e0b",
          icon: "time",
          label: "Pending",
        };
      case "cancelled":
        return {
          color: "#ef4444",
          icon: "close-circle",
          label: "Cancelled",
        };
      case "refunded":
        return {
          color: "#8b5cf6",
          icon: "return-up-back",
          label: "Refunded",
        };
      default:
        return {
          color: "#6b7280",
          icon: "help-circle",
          label: "Unknown",
        };
    }
  }
}
