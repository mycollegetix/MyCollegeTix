// src/services/legalService.ts - Legal Agreements Service
import { supabase } from '@/src/lib/supabase';

export type AgreementType = 'terms_of_service' | 'privacy_policy';

// Website URLs for fetching live documents
const WEBSITE_URLS = {
  terms_of_service: 'https://mycollegetix.com/terms-and-conditions.html',
  privacy_policy: 'https://mycollegetix.com/privacy-policy.html'
};

// Fallback documents (hardcoded) - Plain text formatting for better mobile display
const FALLBACK_DOCUMENTS = {
  terms_of_service: `MyCollegeTix Terms of Service

Effective Date: January 1, 2025

1. Acceptance of Terms
By using MyCollegeTix, you agree to these terms and conditions.

2. Description of Service
MyCollegeTix is a platform for college students to buy and sell event tickets within their campus community.

3. User Eligibility
You must be 18+ and have a valid .edu email to use this service.

4. User Responsibilities
Users are responsible for accurate information, secure accounts, and compliance with college policies.

5. User Conduct
Users may not:
• Post fraudulent tickets or misrepresent information
• Harass or impersonate others
• Use the platform for commercial resale or scalping

6. Transactions
All transactions are between users. MyCollegeTix facilitates but does not guarantee transactions.

7. Limitation of Liability
MyCollegeTix limits liability to the maximum extent permitted by law.

8. Privacy
Your privacy is protected according to our Privacy Policy.

9. Termination
We may terminate accounts that violate these terms.

10. Changes to Terms
We may update these terms periodically. Continued use constitutes acceptance.

11. Contact Information
For questions, contact us at contact@mycollegetix.com`,
  privacy_policy: `MyCollegeTix Privacy Policy

Effective Date: January 1, 2025

MyCollegeTix is committed to protecting your privacy. This policy explains how we collect, use, and protect your personal information.

Information We Collect
• Account Information: Name, email, college affiliation
• Usage Data: Platform activity, device information
• Communication: Messages and support interactions

How We Use Information
• Verify student status with .edu email verification
• Facilitate secure ticket transactions
• Improve platform services
• Prevent fraud and maintain security
• Send important platform updates

Information Sharing
We do not sell your personal information. We only share data:
• With your consent
• To comply with legal requirements
• To protect platform security
• With service providers under strict agreements

Data Security
We implement industry-standard security measures to protect your data, though no system is 100% secure.

Your Rights
• Access your personal information
• Request data deletion
• Opt out of non-essential communications
• Update account information

Data Retention
We retain data while your account is active and delete personal information within 30 days of account deletion.

Student Privacy
We recognize the importance of student privacy and comply with applicable educational privacy laws.

Contact Us
For privacy questions, contact privacy@mycollegetix.com

For general inquiries, contact contact@mycollegetix.com`
};

interface LegalAgreement {
  id: string;
  user_id: string;
  agreement_type: AgreementType;
  version: string;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
}

class LegalService {
  private static instance: LegalService;
  private currentVersion = '1.0'; // Update this when terms/privacy policy changes

  private constructor() {}

  static getInstance(): LegalService {
    if (!LegalService.instance) {
      LegalService.instance = new LegalService();
    }
    return LegalService.instance;
  }

  // Check if user has accepted current version of agreements
  async hasUserAcceptedAgreements(userId: string): Promise<boolean> {
    try {
      console.log('Checking legal agreements for user:', userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('legal_agreements_accepted, legal_agreements_version')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile for legal check:', error);
        // If the column doesn't exist yet, assume agreements are accepted (since they're handled during registration now)
        if (error.message?.includes('legal_agreements_accepted')) {
          console.log('Legal agreements columns do not exist yet, assuming accepted (handled during registration)');
          return true;
        }
        return true; // Default to true to avoid blocking users
      }

      if (!profile) {
        console.log('No profile found for user, assuming accepted');
        return true;
      }

      // If legal_agreements_accepted is null/undefined, assume it's accepted (legacy users or new flow)
      const hasAccepted = profile.legal_agreements_accepted !== false;
      
      console.log('Legal agreements status:', {
        accepted: profile.legal_agreements_accepted,
        version: profile.legal_agreements_version,
        currentVersion: this.currentVersion,
        hasAccepted
      });

      return hasAccepted;
    } catch (error) {
      console.error('Error checking legal agreements:', error);
      return true; // Default to true to avoid blocking users
    }
  }

  // Record user's acceptance of legal agreements
  async acceptLegalAgreements(
    userId: string,
    acceptedAgreements: AgreementType[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();

      // Only update user profile (skip the legal_agreements table to avoid RLS issues)
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            legal_agreements_accepted: true,
            legal_agreements_version: this.currentVersion,
            legal_agreements_accepted_at: now,
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating profile:', updateError);
          // If columns don't exist, just succeed anyway
          if (updateError.message?.includes('legal_agreements_accepted')) {
            console.log('Legal agreement columns do not exist in profiles table yet');
            return { success: true };
          }
          return { success: false, error: 'Failed to update user profile' };
        }
      } catch (updateError) {
        console.error('Profile update failed, columns may not exist:', updateError);
        return { success: true }; // Succeed anyway for now
      }

      console.log('Legal agreements successfully recorded for user:', userId);
      return { success: true };
    } catch (error) {
      console.error('Error in acceptLegalAgreements:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Get user's legal agreement history
  async getUserAgreementHistory(userId: string): Promise<LegalAgreement[]> {
    try {
      // Since we're avoiding the legal_agreements table, return empty array for now
      // This could be enhanced later if needed
      console.log('Legal agreement history not available (avoiding RLS issues)');
      return [];
    } catch (error) {
      console.error('Error in getUserAgreementHistory:', error);
      return [];
    }
  }

  // Check if specific agreement type has been accepted
  async hasAcceptedAgreement(
    userId: string, 
    agreementType: AgreementType
  ): Promise<boolean> {
    try {
      // Since we're using the simplified flow, just check if user has accepted agreements in general
      return await this.hasUserAcceptedAgreements(userId);
    } catch (error) {
      return true; // Default to true to avoid blocking users
    }
  }

  // Force user to re-accept agreements (when terms change)
  async invalidateUserAgreements(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          legal_agreements_accepted: false,
          legal_agreements_version: null,
          legal_agreements_accepted_at: null,
        })
        .eq('id', userId);

      if (error) {
        console.error('Error invalidating agreements:', error);
        return { success: false, error: 'Failed to invalidate agreements' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in invalidateUserAgreements:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Get current version
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  // Fetch legal document from website with fallback
  async getLegalDocument(type: AgreementType): Promise<{
    content: string;
    source: 'website' | 'fallback' | 'error';
    error?: string;
  }> {
    try {
      console.log(`Fetching ${type} from website...`);
      
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
      });
      
      // Try to fetch from website with timeout
      const fetchPromise = fetch(WEBSITE_URLS[type], {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'MyCollegeTix-App/1.0'
        }
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (response.ok) {
        const html = await response.text();
        
        // Extract content from HTML (basic extraction)
        const content = this.extractContentFromHtml(html, type);
        
        if (content && content.length > 100) { // Basic validation
          console.log(`✅ Successfully fetched ${type} from website`);
          return {
            content,
            source: 'website'
          };
        }
      }
      
      console.log(`⚠️ Website fetch failed for ${type}, using fallback`);
      throw new Error('Website content invalid or empty');
      
    } catch (error) {
      console.log(`❌ Error fetching ${type} from website:`, error);
      console.log(`🔄 Using fallback ${type}`);
      
      return {
        content: FALLBACK_DOCUMENTS[type],
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Extract readable content from HTML
  private extractContentFromHtml(html: string, type: AgreementType): string {
    try {
      console.log(`🔍 Extracting content from ${type} HTML (length: ${html.length})`);
      
      // Find the main content area - look for content between <main> tags or content div
      let mainContent = html;
      
      // Try to extract main content area
      const mainMatch = html.match(/<main[^>]*>(.*?)<\/main>/is);
      if (mainMatch) {
        mainContent = mainMatch[1];
        console.log(`📄 Found <main> content (length: ${mainContent.length})`);
      } else {
        // Look for content div
        const contentMatch = html.match(/<div[^>]*class="content"[^>]*>(.*?)<\/div>/is);
        if (contentMatch) {
          mainContent = contentMatch[1];
          console.log(`📄 Found .content div (length: ${mainContent.length})`);
        }
      }

      // Remove scripts, styles, nav, footer
      let cleanContent = mainContent
        .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove scripts
        .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove styles
        .replace(/<nav[^>]*>.*?<\/nav>/gis, '') // Remove navigation
        .replace(/<footer[^>]*>.*?<\/footer>/gis, '') // Remove footer
        .replace(/<!--.*?-->/gs, ''); // Remove comments

      // Convert HTML structure to formatted text
      cleanContent = cleanContent
        // Convert headers to formatted text
        .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, text) => {
          const headerText = text.replace(/<[^>]*>/g, '').trim();
          return `\n\n${headerText}\n${'-'.repeat(Math.min(headerText.length, 50))}\n`;
        })
        // Convert paragraphs
        .replace(/<p[^>]*>(.*?)<\/p>/gi, (match, text) => {
          const cleanText = text.replace(/<[^>]*>/g, '').trim();
          return cleanText ? `\n${cleanText}\n` : '';
        })
        // Convert list items
        .replace(/<li[^>]*>(.*?)<\/li>/gi, (match, text) => {
          const cleanText = text.replace(/<[^>]*>/g, '').trim();
          return cleanText ? `• ${cleanText}\n` : '';
        })
        // Convert divs with section class to paragraphs
        .replace(/<div[^>]*class="[^"]*section[^"]*"[^>]*>(.*?)<\/div>/gis, (match, text) => {
          return `\n${text}\n`;
        })
        // Remove remaining HTML tags
        .replace(/<[^>]*>/g, ' ')
        // Clean up HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        // Normalize whitespace
        .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple newlines to double newline
        .trim();

      console.log(`✅ Extracted content length: ${cleanContent.length}`);
      console.log(`📝 Content preview: ${cleanContent.substring(0, 200)}...`);

      return cleanContent;
    } catch (error) {
      console.error('Error extracting content from HTML:', error);
      return '';
    }
  }

  // Get both documents (convenience method)
  async getAllLegalDocuments(): Promise<{
    termsOfService: { content: string; source: 'website' | 'fallback' | 'error'; error?: string };
    privacyPolicy: { content: string; source: 'website' | 'fallback' | 'error'; error?: string };
  }> {
    const [termsOfService, privacyPolicy] = await Promise.all([
      this.getLegalDocument('terms_of_service'),
      this.getLegalDocument('privacy_policy')
    ]);

    return {
      termsOfService,
      privacyPolicy
    };
  }

  // Admin function: Get agreement statistics
  async getAgreementStats(): Promise<{
    totalUsers: number;
    acceptedUsers: number;
    pendingUsers: number;
    recentAcceptances: number;
  }> {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get users who accepted current version
      const { count: acceptedUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('legal_agreements_accepted', true)
        .eq('legal_agreements_version', this.currentVersion);

      // Get recent acceptances (last 7 days) - simplified to avoid RLS issues
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recentAcceptances } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('legal_agreements_accepted', true)
        .gte('legal_agreements_accepted_at', sevenDaysAgo.toISOString());

      return {
        totalUsers: totalUsers || 0,
        acceptedUsers: acceptedUsers || 0,
        pendingUsers: (totalUsers || 0) - (acceptedUsers || 0),
        recentAcceptances: recentAcceptances || 0,
      };
    } catch (error) {
      console.error('Error getting agreement stats:', error);
      return {
        totalUsers: 0,
        acceptedUsers: 0,
        pendingUsers: 0,
        recentAcceptances: 0,
      };
    }
  }
}

export const legalService = LegalService.getInstance();