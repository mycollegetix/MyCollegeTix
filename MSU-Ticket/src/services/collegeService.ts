// src/services/collegeService.ts - Fixed version based on your working code

import { supabase } from "@/src/lib/supabase";
import {
  College,
  TablesInsert,
  TablesUpdate,
} from "@/src/types/database.types";

// Types for service responses
export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface CollegeStats {
  id: string;
  name: string;
  short_name: string;
  user_count: number;
  event_count: number;
  ticket_count: number;
  active_ticket_count: number;
  total_revenue: number;
}

export interface CollegeWithStats extends College {
  stats?: {
    user_count: number;
    event_count: number;
    ticket_count: number;
    active_ticket_count: number;
  };
}

// Email validation result
export interface EmailValidationResult {
  isValid: boolean;
  college: College | null;
  message: string;
}

// College search/filter options
export interface CollegeFilters {
  isActive?: boolean;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export class CollegeService {
  // ============================================
  // BASIC CRUD OPERATIONS
  // ============================================

  /**
   * Get all colleges with optional filtering
   */
  static async getColleges(
    filters: CollegeFilters = {}
  ): Promise<ServiceResponse<College[]>> {
    try {
      let query = supabase.from("colleges").select("*");

      if (filters.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
      }

      if (filters.searchTerm) {
        query = query.or(
          `name.ilike.%${filters.searchTerm}%,short_name.ilike.%${filters.searchTerm}%`
        );
      }

      query = query.order("name");

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 50) - 1
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ Error loading colleges:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      return {
        data: (data as College[]) || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in getColleges:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  /**
   * Get only active colleges (for registration dropdown)
   */
  static async getActiveColleges(): Promise<ServiceResponse<College[]>> {
    return this.getColleges({ isActive: true });
  }

  /**
   * Get ALL colleges (for admin view)
   */
  static async getAllColleges(): Promise<ServiceResponse<College[]>> {
    try {
      console.log("🏫 Admin: Getting all colleges...");

      const { data, error } = await supabase
        .from("colleges")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("❌ Error getting all colleges:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      console.log("✅ Retrieved all colleges:", data?.length || 0);
      return {
        data: data as College[],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in getAllColleges:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  /**
   * Get college by ID
   */
  static async getCollegeById(id: string): Promise<ServiceResponse<College>> {
    try {
      const { data, error } = await supabase
        .from("colleges")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      return {
        data: data as College,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  /**
   * Get college by email domain
   */
  static async getCollegeByEmailDomain(
    email: string
  ): Promise<ServiceResponse<College>> {
    try {
      // First try using the database function
      const { data: collegeId, error: functionError } = await supabase.rpc(
        "get_college_by_email",
        { email_address: email }
      );

      if (functionError) {
        console.warn(
          "Database function failed, using fallback method:",
          functionError
        );
      }

      if (collegeId && !functionError) {
        return this.getCollegeById(collegeId);
      }

      // Fallback method: extract domain and query directly
      const domain = email.split("@")[1]?.toLowerCase();
      if (!domain) {
        return {
          data: null,
          error: "Invalid email format",
          success: false,
        };
      }

      const { data, error } = await supabase
        .from("colleges")
        .select("*")
        .eq("email_domain", domain)
        .eq("is_active", true)
        .single();

      if (error) {
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      return {
        data: data as College,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  // ============================================
  // ADMIN OPERATIONS (Using SQL Functions)
  // ============================================

  /**
   * Create a new college (admin only)
   */
  static async createCollege(
    collegeData: TablesInsert<"colleges">
  ): Promise<ServiceResponse<College>> {
    try {
      console.log("🏫 Creating college with SQL function:", collegeData);

      // Check admin permissions first
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return {
          data: null,
          error: "Admin privileges required to create colleges",
          success: false,
        };
      }

      // ✅ FIXED: Handle undefined values properly
      const { data: collegeId, error } = await supabase.rpc(
        "admin_create_college",
        {
          college_name: collegeData.name,
          college_short_name: collegeData.short_name,
          college_email_domain: collegeData.email_domain,
          college_primary_color: collegeData.primary_color || undefined,
          college_secondary_color: collegeData.secondary_color || undefined,
          college_is_active: collegeData.is_active ?? undefined,
        }
      );

      if (error) {
        console.error("❌ Error in SQL function create:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      console.log("✅ SQL function create successful, college ID:", collegeId);

      // Fetch the created college to return
      const createdCollege = await this.getCollegeById(collegeId);
      if (createdCollege.success && createdCollege.data) {
        return createdCollege;
      } else {
        return {
          data: { id: collegeId, ...collegeData } as College,
          error: null,
          success: true,
        };
      }
    } catch (error) {
      console.error("❌ Unexpected error creating college:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  /**
   * Update college (admin only) - Now uses comprehensive SQL function
   */
  static async updateCollege(
    id: string,
    updates: TablesUpdate<"colleges">
  ): Promise<ServiceResponse<College>> {
    try {
      console.log("🔄 Updating college:", id, updates);

      // Check admin permissions first
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return {
          data: null,
          error: "Admin privileges required to update colleges",
          success: false,
        };
      }

      // Handle simple active status toggle
      if (
        updates.is_active !== undefined &&
        Object.keys(updates).length === 1
      ) {
        console.log("📌 Using toggle function for simple active status update");
        return this.toggleCollegeActiveStatus(id, updates.is_active);
      }

      // For complex updates, try the SQL function (if available)
      if (typeof supabase.rpc === "function") {
        try {
          const { data, error } = await supabase.rpc("admin_update_college", {
            college_id: id,
            college_name: updates.name || undefined,
            college_short_name: updates.short_name || undefined,
            college_email_domain: updates.email_domain || undefined,
            college_primary_color: updates.primary_color || undefined,
            college_secondary_color: updates.secondary_color || undefined,
            college_is_active: updates.is_active ?? undefined,
          });

          if (!error && data) {
            console.log("✅ SQL function update successful");
            // Just fetch the updated college instead of parsing JSON
            const updatedCollege = await this.getCollegeById(id);
            return updatedCollege;
          }
        } catch (sqlError) {
          console.log(
            "📝 SQL function not available or failed, using direct update"
          );
        }
      }

      // Fallback: Direct database update (this might hit RLS issues)
      console.log("📝 Using direct database update");
      const { data, error } = await supabase
        .from("colleges")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("❌ Direct update failed:", error);
        return {
          data: null,
          error: `Update failed: ${error.message}`,
          success: false,
        };
      }

      console.log("✅ Direct update successful:", data);
      return {
        data: data as College,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("❌ Unexpected error updating college:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  /**
   * Toggle college active status
   */
  static async toggleCollegeActiveStatus(
    collegeId: string,
    isActive: boolean
  ): Promise<ServiceResponse<College>> {
    try {
      console.log(
        `🔄 Toggling college ${collegeId} active status to:`,
        isActive
      );

      // Check admin permissions first (client-side check)
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return {
          data: null,
          error: "Admin privileges required",
          success: false,
        };
      }

      // Use SQL function to bypass RLS issues
      const { data, error } = await supabase.rpc(
        "admin_toggle_college_status",
        {
          college_id: collegeId,
          new_status: isActive,
        }
      );

      if (error) {
        console.error("❌ Error in SQL function toggle:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      console.log("✅ SQL function toggle successful:", data);

      // Fetch the updated college to return
      const updatedCollege = await this.getCollegeById(collegeId);
      if (updatedCollege.success && updatedCollege.data) {
        return updatedCollege;
      } else {
        // If we can't fetch the updated college, return a basic success response
        return {
          data: { id: collegeId, is_active: isActive } as College,
          error: null,
          success: true,
        };
      }
    } catch (error) {
      console.error("💥 Unexpected error in toggleCollegeActiveStatus:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  /**
   * Delete college using SQL function
   */
  static async deleteCollege(
    collegeId: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      console.log("🗑️ Deleting college with SQL function:", collegeId);

      // Check admin permissions
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return {
          data: null,
          error: "Admin privileges required",
          success: false,
        };
      }

      // Use SQL function for smart delete
      const { data, error } = await supabase.rpc("admin_delete_college", {
        college_id: collegeId,
      });

      if (error) {
        console.error("❌ Error in SQL function delete:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      console.log("✅ SQL function delete successful:", data);
      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in deleteCollege:", error);
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
   * Validate college data
   */
  static validateCollegeData(collegeData: Partial<College>): string | null {
    if (!collegeData.name || collegeData.name.trim().length < 3) {
      return "College name must be at least 3 characters long";
    }

    if (!collegeData.short_name || collegeData.short_name.trim().length < 2) {
      return "Short name must be at least 2 characters long";
    }

    if (!collegeData.email_domain || !collegeData.email_domain.includes(".")) {
      return "Please provide a valid email domain (e.g., university.edu)";
    }

    // Check for valid email domain format
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(collegeData.email_domain)) {
      return "Email domain format is invalid";
    }

    // Check color format (hex colors)
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (
      collegeData.primary_color &&
      !colorRegex.test(collegeData.primary_color)
    ) {
      return "Primary color must be a valid hex color (e.g., #18453b)";
    }

    if (
      collegeData.secondary_color &&
      !colorRegex.test(collegeData.secondary_color)
    ) {
      return "Secondary color must be a valid hex color (e.g., #ffd700)";
    }

    return null; // No validation errors
  }

  // ============================================
  // EMAIL VALIDATION
  // ============================================

  /**
   * Validate email domain against active colleges
   */
  static async validateEmailDomain(
    email: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      // First try using the database function
      const { data, error } = await supabase.rpc("is_valid_college_email", {
        email_address: email,
      });

      if (!error && data !== null) {
        return {
          data: data as boolean,
          error: null,
          success: true,
        };
      }

      // Fallback validation
      const domain = email.split("@")[1]?.toLowerCase();
      if (!domain) {
        return {
          data: false,
          error: null,
          success: true,
        };
      }

      const collegesResult = await this.getActiveColleges();

      if (!collegesResult.success || !collegesResult.data) {
        return {
          data: false,
          error: collegesResult.error,
          success: false,
        };
      }

      const isValid = collegesResult.data.some(
        (college: College) => college.email_domain.toLowerCase() === domain
      );

      return {
        data: isValid,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      };
    }
  }

  /**
   * Comprehensive email validation with college info
   */
  static async validateEmailWithCollege(
    email: string
  ): Promise<EmailValidationResult> {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        college: null,
        message: "Please enter a valid email address",
      };
    }

    // Check against college domains
    const collegeResult = await this.getCollegeByEmailDomain(email);

    if (!collegeResult.success || !collegeResult.data) {
      return {
        isValid: false,
        college: null,
        message:
          "Email domain not recognized. Please use your official college email.",
      };
    }

    return {
      isValid: true,
      college: collegeResult.data,
      message: `✓ Valid ${collegeResult.data.short_name} email address`,
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract domain from email address
 */
export const getEmailDomain = (email: string): string | null => {
  const domain = email.split("@")[1];
  return domain ? domain.toLowerCase() : null;
};

/**
 * Check if domain looks like an educational domain
 */
export const isEducationalDomain = (domain: string): boolean => {
  const educationalTLDs = [".edu", ".ac.uk", ".edu.au", ".ca", ".edu.mx"];
  return educationalTLDs.some((tld) => domain.endsWith(tld));
};

/**
 * Validate college email format against specific college
 */
export const validateCollegeEmail = (
  email: string,
  college: College
): boolean => {
  if (!email || !college) return false;

  const emailDomain = getEmailDomain(email);
  return emailDomain === college.email_domain.toLowerCase();
};

/**
 * Generate college theme colors object
 */
export const getCollegeTheme = (college: College | null) => {
  return {
    primary: college?.primary_color || "#18453b",
    secondary: college?.secondary_color || "#ffd700",
    name: college?.short_name || "MSU",
    fullName: college?.name || "Michigan State University",
  };
};
