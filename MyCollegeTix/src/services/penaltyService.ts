// src/services/penaltyService.ts - User Violation and Penalty Management
import { supabase } from "@/src/lib/supabase";

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export type ViolationType =
  | "non_delivery"
  | "non_confirmation"
  | "invalid_ticket"
  | "fraud"
  | "other";

export type Severity = "minor" | "moderate" | "severe";

export type PenaltyType =
  | "warning"
  | "payout_deduction"
  | "temporary_suspension"
  | "permanent_ban";

export type AccountStatus = "active" | "suspended" | "banned";

export interface UserViolation {
  id: string;
  user_id: string;
  dispute_id: string | null;
  violation_type: ViolationType;
  severity: Severity;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface UserPenalty {
  id: string;
  user_id: string;
  violation_id: string | null;
  penalty_type: PenaltyType;
  amount_cents: number | null;
  suspension_until: string | null;
  reason: string;
  applied_by: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ViolationWithDetails extends UserViolation {
  dispute?: {
    id: string;
    reason: string;
    status: string;
    order_id: string;
  };
  created_by_user?: {
    id: string;
    full_name: string;
    username: string;
  };
}

export interface PenaltyWithDetails extends UserPenalty {
  violation?: UserViolation;
  applied_by_user?: {
    id: string;
    full_name: string;
    username: string;
  };
}

export interface AccountStatusInfo {
  canTransact: boolean;
  status: AccountStatus;
  reason?: string;
  suspensionUntil?: string;
  totalViolations: number;
  ratingAdjustment: number;
}

export class PenaltyService {
  // ============================================
  // VIOLATION MANAGEMENT
  // ============================================

  /**
   * Issue a violation to a user (admin only)
   */
  static async issueViolation(
    userId: string,
    violationType: ViolationType,
    severity: Severity,
    description?: string,
    disputeId?: string
  ): Promise<ServiceResponse<UserViolation>> {
    try {
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return { data: null, error: "Admin privileges required", success: false };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: "Not authenticated", success: false };
      }

      const { data, error } = await supabase
        .from("user_violations")
        .insert({
          user_id: userId,
          dispute_id: disputeId || null,
          violation_type: violationType,
          severity,
          description: description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error issuing violation:", error);
        return { data: null, error: error.message, success: false };
      }

      // Update seller rating adjustment based on severity
      const ratingImpact = severity === "severe" ? -1.0 : severity === "moderate" ? -0.5 : 0;
      if (ratingImpact !== 0) {
        await supabase
          .from("profiles")
          .update({
            seller_rating_adjustment: supabase.rpc("add_rating_adjustment", {
              user_id: userId,
              adjustment: ratingImpact,
            }),
          })
          .eq("id", userId);

        // Fallback: direct update if RPC doesn't exist
        const { data: profile } = await supabase
          .from("profiles")
          .select("seller_rating_adjustment")
          .eq("id", userId)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({
              seller_rating_adjustment: (profile.seller_rating_adjustment || 0) + ratingImpact,
            })
            .eq("id", userId);
        }
      }

      console.log(`⚠️ Violation issued to user ${userId}: ${violationType}`);
      return { data, error: null, success: true };
    } catch (error) {
      console.error("Error in issueViolation:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get violations for a user
   */
  static async getUserViolations(userId: string): Promise<ServiceResponse<ViolationWithDetails[]>> {
    try {
      const { data, error } = await supabase
        .from("user_violations")
        .select(`
          *,
          dispute:escrow_disputes (
            id,
            reason,
            status,
            order_id
          ),
          created_by_user:profiles!user_violations_created_by_fkey (
            id,
            full_name,
            username
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as ViolationWithDetails[], error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // ============================================
  // PENALTY MANAGEMENT
  // ============================================

  /**
   * Apply a penalty to a user (admin only)
   */
  static async applyPenalty(
    userId: string,
    penaltyType: PenaltyType,
    reason: string,
    violationId?: string,
    params?: {
      amountCents?: number;
      suspensionDays?: number;
    }
  ): Promise<ServiceResponse<UserPenalty>> {
    try {
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return { data: null, error: "Admin privileges required", success: false };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: "Not authenticated", success: false };
      }

      let suspensionUntil: string | null = null;
      if (penaltyType === "temporary_suspension" && params?.suspensionDays) {
        const date = new Date();
        date.setDate(date.getDate() + params.suspensionDays);
        suspensionUntil = date.toISOString();
      }

      const { data, error } = await supabase
        .from("user_penalties")
        .insert({
          user_id: userId,
          violation_id: violationId || null,
          penalty_type: penaltyType,
          amount_cents: params?.amountCents || null,
          suspension_until: suspensionUntil,
          reason,
          applied_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Error applying penalty:", error);
        return { data: null, error: error.message, success: false };
      }

      // Update account status for suspensions/bans
      if (penaltyType === "temporary_suspension") {
        await supabase
          .from("profiles")
          .update({
            account_status: "suspended",
            suspension_until: suspensionUntil,
          })
          .eq("id", userId);
      } else if (penaltyType === "permanent_ban") {
        await supabase
          .from("profiles")
          .update({
            account_status: "banned",
            suspension_until: null,
          })
          .eq("id", userId);
      }

      console.log(`🔨 Penalty applied to user ${userId}: ${penaltyType}`);
      return { data, error: null, success: true };
    } catch (error) {
      console.error("Error in applyPenalty:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get penalties for a user
   */
  static async getUserPenalties(userId: string): Promise<ServiceResponse<PenaltyWithDetails[]>> {
    try {
      const { data, error } = await supabase
        .from("user_penalties")
        .select(`
          *,
          violation:user_violations (*),
          applied_by_user:profiles!user_penalties_applied_by_fkey (
            id,
            full_name,
            username
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as PenaltyWithDetails[], error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get active payout deductions for a user
   */
  static async getActiveDeductions(userId: string): Promise<ServiceResponse<number>> {
    try {
      const { data, error } = await supabase
        .from("user_penalties")
        .select("amount_cents")
        .eq("user_id", userId)
        .eq("penalty_type", "payout_deduction")
        .eq("is_active", true);

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      const totalDeduction = data.reduce((sum, p) => sum + (p.amount_cents || 0), 0);
      return { data: totalDeduction, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // ============================================
  // SUSPENSION MANAGEMENT
  // ============================================

  /**
   * Suspend a user for a number of days
   */
  static async suspendUser(
    userId: string,
    durationDays: number,
    reason: string
  ): Promise<ServiceResponse<UserPenalty>> {
    return this.applyPenalty(userId, "temporary_suspension", reason, undefined, {
      suspensionDays: durationDays,
    });
  }

  /**
   * Permanently ban a user
   */
  static async banUser(userId: string, reason: string): Promise<ServiceResponse<UserPenalty>> {
    return this.applyPenalty(userId, "permanent_ban", reason);
  }

  /**
   * Reinstate a suspended user (admin only)
   */
  static async reinstateUser(userId: string): Promise<ServiceResponse<boolean>> {
    try {
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return { data: null, error: "Admin privileges required", success: false };
      }

      // Update profile status
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          account_status: "active",
          suspension_until: null,
        })
        .eq("id", userId);

      if (profileError) {
        return { data: null, error: profileError.message, success: false };
      }

      // Deactivate suspension penalties
      await supabase
        .from("user_penalties")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("penalty_type", "temporary_suspension")
        .eq("is_active", true);

      console.log(`✅ User ${userId} reinstated`);
      return { data: true, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // ============================================
  // ACCOUNT STATUS
  // ============================================

  /**
   * Check if a user can transact (not suspended/banned)
   */
  static async checkAccountStatus(userId: string): Promise<ServiceResponse<AccountStatusInfo>> {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("account_status, suspension_until, total_violations, seller_rating_adjustment")
        .eq("id", userId)
        .single();

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      const status = profile.account_status as AccountStatus || "active";
      const suspensionUntil = profile.suspension_until;

      // Check if suspension has expired
      if (status === "suspended" && suspensionUntil) {
        const suspensionDate = new Date(suspensionUntil);
        if (suspensionDate < new Date()) {
          // Auto-reinstate
          await supabase.rpc("check_and_reinstate_user", { check_user_id: userId });
          return {
            data: {
              canTransact: true,
              status: "active",
              totalViolations: profile.total_violations || 0,
              ratingAdjustment: profile.seller_rating_adjustment || 0,
            },
            error: null,
            success: true,
          };
        }
      }

      const canTransact = status === "active";
      let reason: string | undefined;

      if (status === "suspended") {
        const until = suspensionUntil ? new Date(suspensionUntil).toLocaleDateString() : "indefinitely";
        reason = `Your account is suspended until ${until}`;
      } else if (status === "banned") {
        reason = "Your account has been permanently banned";
      }

      return {
        data: {
          canTransact,
          status,
          reason,
          suspensionUntil: suspensionUntil || undefined,
          totalViolations: profile.total_violations || 0,
          ratingAdjustment: profile.seller_rating_adjustment || 0,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get current user's account status
   */
  static async getMyAccountStatus(): Promise<ServiceResponse<AccountStatusInfo>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: "Not authenticated", success: false };
      }
      return this.checkAccountStatus(user.id);
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // ============================================
  // RATING ADJUSTMENT
  // ============================================

  /**
   * Calculate the adjusted seller rating
   */
  static calculateAdjustedRating(baseRating: number, adjustment: number): number {
    const adjusted = baseRating + adjustment;
    return Math.max(0, Math.min(5, adjusted)); // Clamp between 0-5
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get violation type display info
   */
  static getViolationTypeInfo(type: ViolationType): { label: string; color: string } {
    const types: Record<ViolationType, { label: string; color: string }> = {
      non_delivery: { label: "Non-Delivery", color: "#ef4444" },
      non_confirmation: { label: "Non-Confirmation", color: "#f59e0b" },
      invalid_ticket: { label: "Invalid Ticket", color: "#dc2626" },
      fraud: { label: "Fraud", color: "#7f1d1d" },
      other: { label: "Other", color: "#6b7280" },
    };
    return types[type] || { label: "Unknown", color: "#6b7280" };
  }

  /**
   * Get penalty type display info
   */
  static getPenaltyTypeInfo(type: PenaltyType): { label: string; color: string; icon: string } {
    const types: Record<PenaltyType, { label: string; color: string; icon: string }> = {
      warning: { label: "Warning", color: "#f59e0b", icon: "warning" },
      payout_deduction: { label: "Payout Deduction", color: "#dc2626", icon: "cash-outline" },
      temporary_suspension: { label: "Temporary Suspension", color: "#7c3aed", icon: "time-outline" },
      permanent_ban: { label: "Permanent Ban", color: "#7f1d1d", icon: "ban" },
    };
    return types[type] || { label: "Unknown", color: "#6b7280", icon: "help-circle" };
  }

  /**
   * Get severity display info
   */
  static getSeverityInfo(severity: Severity): { label: string; color: string } {
    const severities: Record<Severity, { label: string; color: string }> = {
      minor: { label: "Minor", color: "#f59e0b" },
      moderate: { label: "Moderate", color: "#dc2626" },
      severe: { label: "Severe", color: "#7f1d1d" },
    };
    return severities[severity] || { label: "Unknown", color: "#6b7280" };
  }

  private static async verifyAdminPermissions(): Promise<boolean> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return false;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      return profile?.is_admin === true;
    } catch {
      return false;
    }
  }
}
