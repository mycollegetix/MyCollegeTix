// src/services/collegeService.ts - Fixed TypeScript errors

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
      console.log("🔍 Getting colleges with filters:", filters);
      console.log("🔗 Supabase URL:", process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log(
        "🔑 Supabase Key exists:",
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
      );

      // Test 1: Try the simplest possible query first
      console.log("📝 Test 1: Simple select all");
      const { data: testData, error: testError } = await supabase
        .from("colleges")
        .select("*");

      console.log("📝 Simple query result:", {
        data: !!testData,
        error: testError,
      });

      if (testError) {
        console.error("❌ Simple query failed:", testError);
        return {
          data: null,
          error: testError.message,
          success: false,
        };
      }

      // Test 2: Try with count
      console.log("📝 Test 2: Count query");
      const { count, error: countError } = await supabase
        .from("colleges")
        .select("*", { count: "exact", head: true });

      console.log("📝 Count result:", { count, error: countError });

      // Test 3: Try the filtered query
      console.log("📝 Test 3: Filtered query");
      let query = supabase.from("colleges").select("*");

      if (filters.isActive !== undefined) {
        console.log("📝 Adding isActive filter:", filters.isActive);
        query = query.eq("is_active", filters.isActive);
      }

      query = query.order("name");

      const { data, error } = await query;

      console.log("📝 Final query result:", {
        dataExists: !!data,
        dataLength: data?.length,
        error: error,
      });

      if (error) {
        console.error("❌ Error loading colleges:", error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      console.log("✅ Colleges loaded:", data?.length || 0);
      console.log("📋 First college:", data?.[0]);

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

  // ============================================
  // ADMIN OPERATIONS
  // ============================================

  /**
   * Create a new college (admin only)
   */
  static async createCollege(
    collegeData: TablesInsert<"colleges">
  ): Promise<ServiceResponse<College>> {
    try {
      const { data, error } = await supabase
        .from("colleges")
        .insert(collegeData)
        .select()
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
   * Update college (admin only)
   */
  static async updateCollege(
    id: string,
    updates: TablesUpdate<"colleges">
  ): Promise<ServiceResponse<College>> {
    try {
      const { data, error } = await supabase
        .from("colleges")
        .update(updates)
        .eq("id", id)
        .select()
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
