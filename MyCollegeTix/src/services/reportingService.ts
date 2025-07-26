// src/services/reportingService.ts - Content Reporting Service
import { supabase } from '@/src/lib/supabase';

export type ReportType = 'harassment' | 'spam' | 'inappropriate_content' | 'fraud' | 'other';
export type ContentType = 'ticket' | 'message' | 'profile';

interface CreateReportParams {
  reportedUserId: string;
  contentId: string;
  contentType: ContentType;
  reportType: ReportType;
  description?: string;
}

interface ContentReport {
  id: string;
  content_type: ContentType;
  content_id: string;
  reported_by: string;
  reason: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  admin_notes?: string;
  resolved_at?: string;
}

class ReportingService {
  private static instance: ReportingService;

  private constructor() {}

  static getInstance(): ReportingService {
    if (!ReportingService.instance) {
      ReportingService.instance = new ReportingService();
    }
    return ReportingService.instance;
  }

  // Create a new content report
  async createReport(params: CreateReportParams): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if user has already reported this content
      const { data: existingReport } = await supabase
        .from('content_reports')
        .select('id')
        .eq('reported_by', user.id)
        .eq('content_id', params.contentId)
        .eq('content_type', params.contentType)
        .eq('status', 'pending')
        .single();
      
      if (existingReport) {
        return { success: false, error: 'You have already reported this content' };
      }

      // Create the report
      const { error } = await supabase
        .from('content_reports')
        .insert({
          content_type: params.contentType,
          content_id: params.contentId,
          reported_by: user.id,
          reason: params.reportType,
          description: params.description,
          additional_context: {
            reported_user_id: params.reportedUserId,
            report_type: params.reportType
          }
        });

      if (error) {
        console.error('Error creating report:', error);
        return { success: false, error: 'Failed to submit report' };
      }

      // If this is a harassment report, automatically create a user block
      if (params.reportType === 'harassment') {
        await this.blockUser(params.reportedUserId, 'Harassment report');
      }

      return { success: true };
    } catch (error) {
      console.error('Error in createReport:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Get user's reports
  async getUserReports(): Promise<ContentReport[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('content_reports')
        .select('*')
        .eq('reported_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user reports:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserReports:', error);
      return [];
    }
  }

  // Block a user
  async blockUser(blockedUserId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if already blocked
      const { data: existingBlock } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId)
        .single();

      if (existingBlock) {
        return { success: false, error: 'User is already blocked' };
      }

      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: blockedUserId,
        });

      if (error) {
        console.error('Error blocking user:', error);
        return { success: false, error: 'Failed to block user' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in blockUser:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Unblock a user
  async unblockUser(blockedUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

      if (error) {
        console.error('Error unblocking user:', error);
        return { success: false, error: 'Failed to unblock user' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in unblockUser:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Get blocked users
  async getBlockedUsers(): Promise<Array<{ id: string; blocked_at: string }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id, created_at')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching blocked users:', error);
        return [];
      }

      return data?.map(item => ({
        id: item.blocked_id,
        blocked_at: item.created_at,
      })) || [];
    } catch (error) {
      console.error('Error in getBlockedUsers:', error);
      return [];
    }
  }

  // Check if user is blocked
  async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }

  // Check if current user is blocked by another user
  async isBlockedBy(blockerId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', blockerId)
        .eq('blocked_id', user.id)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }
}

export const reportingService = ReportingService.getInstance();